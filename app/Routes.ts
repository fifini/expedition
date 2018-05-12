import * as express from 'express'
import Config from './config'
import * as Mail from './Mail'
import {oauth2Template, installOAuthRoutes} from './lib/oauth2'
import * as Handlers from './Handlers'
import * as MultiplayerHandlers from './multiplayer/Handlers'
import * as Stripe from './Stripe'
import {Database} from './models/Database'
import * as WebSocket from 'ws';
import * as http from 'http';
import {installRoutes as installAdminRoutes} from './admin/Routes'
import {limitCors} from './lib/cors'
import Sequelize from 'sequelize'

const RateLimit = require('express-rate-limit');

const Mailchimp = require('mailchimp-api-v3');
const mailchimp = (Config.get('NODE_ENV') !== 'dev' && Config.get('MAILCHIMP_KEY')) ? new Mailchimp(Config.get('MAILCHIMP_KEY')) : null;

// Use the oauth middleware to automatically get the user's profile
// information and expose login/logout URLs to templates.
const Router = express.Router();
Router.use(oauth2Template);

const publishLimiter = new RateLimit({
  windowMs: 60*1000, // 1 minute window
  delayAfter: 2, // begin slowing down responses after the second request
  delayMs: 3*1000, // slow down subsequent responses by 3 seconds per request
  max: 5, // start blocking after 5 requests
  message: 'Publishing too frequently. Please wait 1 minute and then try again',
});

// TODO: Rate-limit session creation
const sessionLimiter = new RateLimit({
  windowMs: 60*1000, // 1 minute window
  delayAfter: 4,     // begin slowing down responses after the fourth request
  delayMs: 3*1000,   // slow down subsequent responses by 3 seconds per request
  max: 5,            // start blocking after 5 requests
  message: 'Creating sessions too frequently. Please wait 1 minute and then try again',
});

// We store auth details in res.locals. If there's no stored data there, the user is not logged in.
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!res.locals || !res.locals.id) {
    return res.status(500).end('You are not signed in.');
  }
  next();
}

const db = new Database(new Sequelize(Config.get('DATABASE_URL'), {
  dialectOptions: {
    ssl: true,
  },
  logging: (Config.get('SEQUELIZE_LOGGING') === 'true'),
}));

Router.get('/healthcheck', limitCors, Handlers.healthCheck);
Router.get('/announcements', limitCors, Handlers.announcement);
Router.post('/analytics/:category/:action', limitCors, (req, res) => {Handlers.postAnalyticsEvent(db, req, res);});
Router.post('/quests', limitCors, (req, res) => {Handlers.search(db, req, res);});
Router.get('/raw/:partition/:quest/:version', limitCors, (req, res) => {Handlers.questXMLHandler(db, req, res);});
Router.post('/publish/:id', publishLimiter, limitCors, requireAuth, (req, res) => {Handlers.publish(db, Mail, req, res);});
Router.post('/unpublish/:quest', limitCors, requireAuth, (req, res) => {Handlers.unpublish(db, req, res);});
Router.post('/quest/feedback/:type', limitCors, (req, res) => {Handlers.feedback(db, Mail, req, res);});
Router.post('/user/subscribe', limitCors, (req, res) => {Handlers.subscribe(mailchimp, Config.get('MAILCHIMP_PLAYERS_LIST_ID'), req, res);});
Router.get('/user/quests', limitCors, requireAuth, (req, res) => {Handlers.userQuests(db, req, res);});
Router.get('/multiplayer/v1/user', limitCors, requireAuth, (req, res) => {MultiplayerHandlers.user(db, req, res);});
Router.post('/multiplayer/v1/new_session', sessionLimiter, limitCors, requireAuth, (req, res) => {MultiplayerHandlers.newSession(db, req, res);});
Router.post('/multiplayer/v1/connect', limitCors, requireAuth, (req, res) => {MultiplayerHandlers.connect(db, req, res);});
Router.post('/stripe/checkout', limitCors, (req, res) => {Stripe.checkout(req, res);});

installAdminRoutes(db, Router);
installOAuthRoutes(db, Router);

export function setupWebsockets(server: any) {
  const wss = new WebSocket.Server({
    server,
    verifyClient: (info: any, cb: (verified: boolean)=>any) => {
      MultiplayerHandlers.verifyWebsocket(db, info, cb);
    }
  });

  wss.on('error', (err) => {
    console.error('Caught WSS error: ');
    console.error(err.stack);
  });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    ws.on('error', (e: Error) => console.error(e));
    MultiplayerHandlers.websocketSession(db.models.Session, db.models.SessionClient, ws, req);
  });
}

export default Router;
