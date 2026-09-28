import { Router } from 'express';
import { reposRouter } from './repos.js';
import { reviewsRouter } from './reviews.js';
import { standardsRouter } from './standards.js';
import { authRouter } from './auth.js';

export const apiRouter = Router();

// Auth routes (no authentication required)
apiRouter.use('/auth', authRouter);

// Data routes
apiRouter.use('/repos', reposRouter);
apiRouter.use('/', reviewsRouter); // mounts /repos/:id/reviews, /reviews/:id, /findings/*, /stats/*
apiRouter.use('/', standardsRouter); // mounts /repos/:id/standards-docs
