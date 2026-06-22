let activeRequests = 0;

export const getActiveRequests = () => activeRequests;

export const requestMonitor = (req, res, next) => {
  activeRequests++;
  let decremented = false;

  const decrement = () => {
    if (!decremented) {
      activeRequests = Math.max(0, activeRequests - 1);
      decremented = true;
    }
  };

  res.on('finish', decrement);
  res.on('close', decrement);

  next();
};
