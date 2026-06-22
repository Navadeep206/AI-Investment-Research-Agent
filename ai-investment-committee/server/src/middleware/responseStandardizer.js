export default (req, res, next) => {
  const originalJson = res.json;

  res.json = function (body) {
    // If body is already completely standardized, bypass re-wrapping
    if (
      body &&
      (body.success === true || body.success === false) &&
      body.timestamp &&
      Object.prototype.hasOwnProperty.call(body, 'requestId')
    ) {
      return originalJson.call(this, body);
    }

    const isSuccess = res.statusCode < 400;

    const formatted = {
      success: isSuccess,
      timestamp: new Date().toISOString(),
      requestId: req.requestId || null
    };

    if (isSuccess) {
      formatted.data = body;
    } else {
      formatted.error = {
        message: body?.message || body?.error?.message || 'Request failed',
        status: res.statusCode
      };
    }

    return originalJson.call(this, formatted);
  };

  next();
};
