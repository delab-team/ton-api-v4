import { SocketStream } from "@fastify/websocket";
import { FastifyRequest } from "fastify";
import { LiteClient } from "ton-lite-client";
import { BlockSync } from "../../sync/BlockSync";

export function handleBlockWatch(client: LiteClient, blockSync: BlockSync) {
    return (connection: SocketStream, request: FastifyRequest) => {
        connection.socket.send(JSON.stringify(blockSync.currentSimple));
        let handler = (src: any) => connection.socket.send(JSON.stringify(src));
        blockSync.on('block', handler);
        connection.on('close', () => {
            blockSync.off('block', handler);
        });
    };
}