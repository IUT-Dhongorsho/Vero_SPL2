import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { channels, channelMembers } from '../models/channel.model.js';
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
const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;
const createChannel = async (call, callback) => {
    try {
        const { name, type, externalId, workspaceId } = call.request;
        const [newChannel] = await db.insert(channels).values({
            name,
            type: type || 'group',
            externalId,
            workspaceId,
        }).returning();
        callback(null, {
            id: newChannel.id,
            name: newChannel.name,
            type: newChannel.type,
            externalId: newChannel.externalId,
            success: true,
            message: 'Channel created successfully',
        });
    }
    catch (error) {
        console.error('gRPC CreateChannel Error:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: error.message,
        });
    }
};
const addMembers = async (call, callback) => {
    try {
        const { channelId, userIds } = call.request;
        const memberData = userIds.map((userId) => ({
            channelId,
            userId,
            role: 'member',
        }));
        if (memberData.length > 0) {
            await db.insert(channelMembers).values(memberData);
        }
        callback(null, {
            id: channelId,
            success: true,
            message: 'Members added successfully',
        });
    }
    catch (error) {
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
