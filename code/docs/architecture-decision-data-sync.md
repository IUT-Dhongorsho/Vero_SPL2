# Architectural Decision Record: Data Synchronization and Caching

**Date:** 2026-06-27
**Context:** Vero_SPL2 Productivity App Microservices

## Problem Statement
The application consists of multiple independent microservices (auth-service, board-service, chat-service, meet-service, project-service, etc.). These services frequently need to access two specific types of cross-cutting data:
1.  **User Profile Data** (e.g., id, name, email, avatar_url)
2.  **Session Data** (e.g., active tokens, login state)

We need to establish a blazing fast and super durable strategy for services to access this data without introducing tight coupling or creating single points of failure that degrade overall performance.

## Considered Alternatives
1.  **Strict Centralization (Redis + gRPC):** Services store no user data locally. They fetch from a central Redis cache, falling back to a synchronous gRPC call to `auth-service` on a cache miss.
2.  **Strict Data Duplication (Shadow Tables):** Services maintain their own local database tables ("shadow tables") for all cross-cutting entities (both users and sessions), synchronized via events.

## Decision: The Hybrid Approach

To achieve maximum performance (for complex queries) and high durability, we will split our strategy based on the data's lifecycle and access patterns:

### 1. User Profile Data 👉 Shadow Tables (Database-per-Service)
*   **Strategy:** Domain services (`project-service`, `board-service`, etc.) will maintain their own local `users` shadow tables containing essential, non-sensitive profile data.
*   **Synchronization:** When `auth-service` updates a user, it will publish an event (e.g., `UserUpdated`) to a message broker (RabbitMQ/Kafka). Other services will consume this event and update their local shadow tables (Eventual Consistency).
*   **Rationale:** This completely solves the "N+1 Join Problem". Services can execute lightning-fast, native SQL `JOIN`s to filter, sort, and paginate domain entities based on user attributes (e.g., "Find all tasks assigned to users named 'Alex'"). It also provides high availability; if `auth-service` goes down, other services remain fully functional for reads.

### 2. Session Data 👉 Centralized Redis Cache
*   **Strategy:** Do NOT create shadow tables for sessions. Session state will be stored in a centralized Redis cluster managed by `auth-service`.
*   **Access:** When a request hits a domain service, the authentication middleware will validate the session token directly against the Redis cluster. If Redis is temporarily unavailable, it may fall back to a gRPC call to `auth-service`.
*   **Rationale:** Session data is highly ephemeral and mutates constantly (logins/logouts). Furthermore, domain services never need to execute SQL `JOIN`s on session tokens. Centralizing this in Redis prevents unnecessary database churn and simplifies token revocation.

## Conclusion
This hybrid architecture guarantees that the application remains "blazing fast" for complex queries by leveraging local database joins for persistent data, while remaining "super durable" by decoupling services via asynchronous events and centralized caching for ephemeral state.
