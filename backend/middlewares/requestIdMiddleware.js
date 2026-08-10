import crypto from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';

export const requestIdMiddleware = (req, res, next) => {
  const incomingRequestId = req.get(REQUEST_ID_HEADER);
  const requestId = incomingRequestId && incomingRequestId.length <= 128
    ? incomingRequestId
    : crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
