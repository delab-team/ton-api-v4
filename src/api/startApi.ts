/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fastify from 'fastify';
import { LiteClient } from 'ton-lite-client';
import { BlockSync } from '../sync/BlockSync';
import { log } from '../utils/log';
import { handleAccountGet } from './handlers/handleAccountGet';
import { handleAccountGetChanged } from './handlers/handleAccountGetChanged';
import { handleAccountGetLite } from './handlers/handleAccountGetLite';
import { handleAccountRun } from './handlers/handleAccountRun';
import { handleBlockWatch } from './handlers/handleBlockWatch';
import { handleBlockWatchChanged } from './handlers/handleBlockWatchChanged';
import { handleGetBlock } from './handlers/handleGetBlock';
import { handleGetBlockByUtime } from './handlers/handleGetBlockByTime';
import { handleGetBlockLatest } from './handlers/handleGetBlockLatest';
import { handleGetConfig } from './handlers/handleGetConfig';
import { handleGetTransactions } from './handlers/handleGetTransactions';
import { handleSend } from './handlers/handleSend';
import { handleGetParsedTransactions } from './handlers/handleGetParsedTransactions';

export async function startApi(client: LiteClient, child: { clients: LiteClient[] }[], blockSync: BlockSync) {

    // Configure
    log('Starting API...');
    const app = fastify({ 
        logger: process.env.LOG_ENABLE === 'true',
        maxParamLength: 500,
    });
    app.register(require('@fastify/websocket'));
    app.register(require('@fastify/cors'), {
        origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
            const allowedOrigins = [
                /.*\.delabteam\.com$/,
                /http:\/\/localhost(:\d+)?$/,
                /http:\/\/127\.0\.0\.1(:\d+)?$/,
                /https:\/\/localhost(:\d+)?$/,
                /https:\/\/127\.0\.0\.1(:\d+)?$/
            ];
            if (!origin || allowedOrigins.some(regex => regex.test(origin))) {
                cb(null, true);
            } else {
                cb(new Error("Not allowed by CORS"), false);
            }
        },
        allowedHeaders: '*',
        methods: ['GET']
    });
    app.get('/', (req, res) => {
        res.send('Welcome to TON API v4!');
    });

    // Handlers
    app.get('/block/watch', { websocket: true } as any, handleBlockWatch(client, blockSync));
    app.get('/block/watch/changed', { websocket: true } as any, handleBlockWatchChanged(client, blockSync));
    app.get('/block/latest', handleGetBlockLatest(client, blockSync));
    app.get('/block/utime/:utime', handleGetBlockByUtime(client));
    app.get('/block/:seqno', handleGetBlock(client));
    app.get('/block/:seqno/config', handleGetConfig(client));
    app.get('/block/:seqno/config/:ids', handleGetConfig(client));
    app.get('/block/:seqno/:address', handleAccountGet(client));
    app.get('/block/:seqno/:address/lite', handleAccountGetLite(client));
    app.get('/block/:seqno/:address/changed/:lt', handleAccountGetChanged(client));
    app.get('/block/:seqno/:address/run/:command/:args?', handleAccountRun(client));
    app.post('/block/:seqno/:address/run/:command', handleAccountRun(client));
    app.get('/account/:address/tx/:lt/:hash', handleGetTransactions(client));
    app.get('/account/:address/tx/parsed/:lt/:hash', handleGetParsedTransactions(client));

    // Sending
    app.post('/send', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    boc: { type: 'string' }
                },
                required: ['boc']
            }
        }
    }, handleSend(child));

    // Start
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await app.listen(port, '0.0.0.0');
    log('API ready on port http://localhost:' + port);
}