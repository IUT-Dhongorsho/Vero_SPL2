import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { users } from '../models/user.model.js';
import { ne } from 'drizzle-orm';

export class UserController {
  /**
   * Returns a list of all synchronized users, excluding the current user.
   * This is useful for selecting users to create a new chat room.
   */
  async getUsers(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      console.log(`🔍 [UserController:getUsers] Request from user: ${currentUser.id}`);
      
      const allUsers = await db.select().from(users);
      console.log(`📊 [UserController:getUsers] Total users in local DB: ${allUsers.length}`);

      const userList = await db.query.users.findMany({
        where: ne(users.id, currentUser.id)
      });

      console.log(`✅ [UserController:getUsers] Returning ${userList.length} users (excluding self)`);
      res.json(userList);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
}

export const userController = new UserController();
