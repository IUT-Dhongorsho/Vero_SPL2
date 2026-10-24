#!/bin/bash
# Board Service — Manual API Test Script
# Run: bash test-manual.sh
# Prerequisites: PostgreSQL running, Redis running, .env configured

set -e

BASE="http://localhost:8002"

echo "========================================="
echo "  BOARD SERVICE — MANUAL API TESTS"
echo "========================================="

# Create a project in the database directly (since project-service handles project creation)
echo ""
echo ">> Setting up test data in database..."
PROJ_ID=$(psql -t -A -c "INSERT INTO projects (name, description, workspace_id, owner_id) VALUES ('Test Project', 'Manual test', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001') RETURNING id;" board_db 2>/dev/null | tr -d '[:space:]')
echo "   Created project: $PROJ_ID"

echo ""
echo "========================================="
echo "  TEST 1: Health Check"
echo "========================================="
curl -s $BASE/health | python3 -m json.tool

echo ""
echo "========================================="
echo "  TEST 2: Initialize Board (4 default columns)"
echo "========================================="
curl -s -X POST "$BASE/api/board/init/$PROJ_ID" | python3 -m json.tool

echo ""
echo "========================================="
echo "  TEST 3: Get Columns"
echo "========================================="
COLUMNS=$(curl -s "$BASE/api/board/columns/$PROJ_ID")
echo "$COLUMNS" | python3 -m json.tool

# Extract first column ID (Backlog)
BACKLOG_COL=$(echo "$COLUMNS" | python3 -c "import sys,json; cols=json.load(sys.stdin); print([c['id'] for c in cols if c['name']=='Backlog'][0])")
IN_PROGRESS_COL=$(echo "$COLUMNS" | python3 -c "import sys,json; cols=json.load(sys.stdin); print([c['id'] for c in cols if c['name']=='In Progress'][0])")
IN_REVIEW_COL=$(echo "$COLUMNS" | python3 -c "import sys,json; cols=json.load(sys.stdin); print([c['id'] for c in cols if c['name']=='In Review'][0])")
DONE_COL=$(echo "$COLUMNS" | python3 -c "import sys,json; cols=json.load(sys.stdin); print([c['id'] for c in cols if c['name']=='Done'][0])")

echo ""
echo "   Backlog column: $BACKLOG_COL"
echo "   In Progress column: $IN_PROGRESS_COL"
echo "   In Review column: $IN_REVIEW_COL"
echo "   Done column: $DONE_COL"

echo ""
echo "========================================="
echo "  TEST 4: Create Tasks"
echo "========================================="
TASK1=$(curl -s -X POST "$BASE/api/board/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Setup CI/CD pipeline\",\"columnId\":\"$BACKLOG_COL\",\"creatorId\":\"user-1\",\"priority\":\"high\"}")
echo "Task 1 created:"
echo "$TASK1" | python3 -m json.tool
TASK1_ID=$(echo "$TASK1" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

TASK2=$(curl -s -X POST "$BASE/api/board/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Write documentation\",\"columnId\":\"$BACKLOG_COL\",\"creatorId\":\"user-1\",\"priority\":\"medium\"}")
echo "Task 2 created:"
TASK2_ID=$(echo "$TASK2" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

TASK3=$(curl -s -X POST "$BASE/api/board/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Fix login bug\",\"columnId\":\"$IN_PROGRESS_COL\",\"creatorId\":\"user-2\",\"priority\":\"urgent\"}")
echo "Task 3 created:"
TASK3_ID=$(echo "$TASK3" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "========================================="
echo "  TEST 5: Get All Tasks for Project"
echo "========================================="
curl -s "$BASE/api/board/tasks/$PROJ_ID" | python3 -m json.tool

echo ""
echo "========================================="
echo "  TEST 6: Get Single Task"
echo "========================================="
curl -s "$BASE/api/board/tasks/detail/$TASK1_ID" | python3 -m json.tool

echo ""
echo "========================================="
echo "  TEST 7: Update Task"
echo "========================================="
curl -s -X PATCH "$BASE/api/board/tasks/$TASK1_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"Setup CI/CD pipeline (updated)","priority":"urgent"}' | python3 -m json.tool

echo ""
echo "========================================="
echo "  TEST 8: Move Task (Backlog -> In Progress)"
echo "========================================="
curl -s -X PATCH "$BASE/api/board/tasks/$TASK1_ID/move" \
  -H "Content-Type: application/json" \
  -d "{\"columnId\":\"$IN_PROGRESS_COL\",\"order\":0}" | python3 -m json.tool

echo ""
echo "========================================="
echo "  TEST 9: Move Task (In Progress -> In Review -> Done)"
echo "========================================="
curl -s -X PATCH "$BASE/api/board/tasks/$TASK1_ID/move" \
  -H "Content-Type: application/json" \
  -d "{\"columnId\":\"$IN_REVIEW_COL\",\"order\":0}" | python3 -m json.tool

curl -s -X PATCH "$BASE/api/board/tasks/$TASK1_ID/move" \
  -H "Content-Type: application/json" \
  -d "{\"columnId\":\"$DONE_COL\",\"order\":0}" | python3 -m json.tool

echo ""
echo "========================================="
echo "  TEST 10: Create Custom Column"
echo "========================================="
CUSTOM_COL=$(curl -s -X POST "$BASE/api/board/columns" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Blocked\",\"projectId\":\"$PROJ_ID\"}")
echo "$CUSTOM_COL" | python3 -m json.tool
CUSTOM_COL_ID=$(echo "$CUSTOM_COL" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "========================================="
echo "  TEST 11: Delete Task"
echo "========================================="
curl -s -X DELETE "$BASE/api/board/tasks/$TASK2_ID" -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "========================================="
echo "  TEST 12: Delete Custom Column"
echo "========================================="
curl -s -X DELETE "$BASE/api/board/columns/$CUSTOM_COL_ID" -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "========================================="
echo "  FINAL: Get Updated Columns (with task counts)"
echo "========================================="
curl -s "$BASE/api/board/columns/$PROJ_ID" | python3 -m json.tool

echo ""
echo "========================================="
echo "  ALL TESTS COMPLETE"
echo "========================================="

# Cleanup
echo ""
echo ">> Cleaning up test data..."
psql -c "DELETE FROM tasks WHERE column_id IN (SELECT id FROM columns WHERE project_id = '$PROJ_ID');" board_db 2>/dev/null
psql -c "DELETE FROM columns WHERE project_id = '$PROJ_ID';" board_db 2>/dev/null
psql -c "DELETE FROM projects WHERE id = '$PROJ_ID';" board_db 2>/dev/null
echo "   Done."
