import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { channelService } from '../services/channel.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, '../../proto/chat.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const chatProto = (grpc.loadPackageDefinition(packageDefinition) as any).chat;

const createChannel = async (call: any, callback: any) => {
  try {
    const { name, type, externalId, workspaceId } = call.request;

    // Use centralized service
    const newChannel = await channelService.createChannel({
        name,
        type,
        creatorId: 'system', // Project service acts as system
        externalId,
        workspaceId
    });

    callback(null, {
      id: newChannel.id,
      name: newChannel.name,
      type: newChannel.type,
      externalId: newChannel.externalId,
      success: true,
      message: 'Channel created successfully',
    });
  } catch (error: any) {
    console.error('gRPC CreateChannel Error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
};

const addMembers = async (call: any, callback: any) => {
  try {
    const { channelId, userIds } = call.request;

    await channelService.addMembers(channelId, userIds);

    callback(null, {
      id: channelId,
      success: true,
      message: 'Members added successfully',
    });
  } catch (error: any) {
    console.error('gRPC AddMembers Error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
};

export const initGrpcServer = () => {
  const server = new grpc.Server();
  server.addService(chatProto.ChatService.service, {
    createChannel,
    addMembers,
  });

  const address = `0.0.0.0:${env.GRPC_PORT}`;
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('gRPC Server bind failed:', err);
      return;
    }
    console.log(`📡 gRPC Server running on port ${port}`);
  });
};
