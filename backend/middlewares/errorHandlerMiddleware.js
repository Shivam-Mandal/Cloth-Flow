export const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (status >= 500) {
    console.error(err && err.stack ? err.stack : err);
  }

  res.status(status).json({
    success: false,
    message: status >= 500 && isProd ? 'Internal Server Error' : err.message || 'Server Error'
  });
};
