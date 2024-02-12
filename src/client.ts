import * as dotenv from 'dotenv';

import {LiteClient, LiteRoundRobinEngine, LiteSingleEngine} from 'ton-lite-client';
import * as fs from "fs";

dotenv.config();
if (process.env.NODE_ENV === 'development') {
    dotenv.config({path: '.env.development'});
} else {
    dotenv.config({path: '.env.production'});
}

const config = process.env.LITE_SERVERS

export async function createClient() {

    const liteServers = config;
    if (!liteServers) {
        console.warn('No LITE_SERVERS environment variable set');
        return null;
    }
    const serverDetails = liteServers.split(', ');

    // Resolve parameters
    let parallelClients = 50;
    if (process.env.TON_THREADS) {
        parallelClients = parseInt(process.env.TON_THREADS, 10);
    }

    // Create engines
    let commonClientEngines: LiteSingleEngine[] = [];
    let child: { clients: LiteClient[] }[] = []

    function intToIP(int: number) {
        var part1 = int & 255;
        var part2 = ((int >> 8) & 255);
        var part3 = ((int >> 16) & 255);
        var part4 = ((int >> 24) & 255);

        return part4 + "." + part3 + "." + part2 + "." + part1;
    }

    serverDetails.forEach(detail => {
        const [ip, port, keyBase64] = detail.split(':');
        let clients = [];
        for (let i = 0; i < parallelClients; i++) {
            // Convert the base64 encoded key to a Buffer
            const keyBuffer = Buffer.from(keyBase64, 'base64');

            // Create a LiteSingleEngine for each client, passing the key as a Buffer
            let engine = new LiteSingleEngine({host: `http://${intToIP(Number(ip))}:${8088}`, publicKey: keyBuffer});
            clients.push(new LiteClient({engine, batchSize: 10}));
            commonClientEngines.push(engine);
        }
        child.push({clients});
    });

    // Create client
    let engine = new LiteRoundRobinEngine(commonClientEngines);
    let client = new LiteClient({engine, batchSize: commonClientEngines.length * 10});
    return {main: client, child};
}