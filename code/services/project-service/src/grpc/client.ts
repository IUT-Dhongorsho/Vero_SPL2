import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { createRequire } from 'module';
import { env } from '../config/env.js';

const require = createRequire(import.meta.url);
const PROTO_PATH = require.resolve('@repo/shared/proto/chat.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const chatProto = (grpc.loadPackageDefinition(packageDefinition) as any).chat;

export const chatGrpcClient = new chatProto.ChatService(
  env.CHAT_SERVICE_GRPC_URL,
  grpc.credentials.createInsecure()
);

/**
 * Promisified gRPC calls for easier async/await usage
 */
export const createChatChannel = (data: {
  name: string;
  type: string;
  externalId: string;
  workspaceId: string;
}): Promise<any> => {
  return new Promise((resolve, reject) => {
    chatGrpcClient.CreateChannel(data, (error: any, response: any) => {
      if (error) {
        console.error('❌ [gRPC:Client] CreateChannel failed:', error);
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
};

export const addChatMembers = (data: {
  channelId: string;
  userIds: string[];
}): Promise<any> => {
  return new Promise((resolve, reject) => {
    chatGrpcClient.AddMembers(data, (error: any, response: any) => {
      if (error) {
        console.error('❌ [gRPC:Client] AddMembers failed:', error);
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
};
