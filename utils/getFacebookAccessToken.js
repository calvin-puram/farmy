const axios = require('axios');
const AppError = require('./appError');

module.exports = async userData => {
  try {
    const { data } = await axios({
      url: 'https://graph.facebook.com/v4.0/oauth/access_token',
      method: 'get',
      params: userData
    });

    return data.access_token;
  } catch (err) {
    return new AppError(err.response.data.error.message, 400);
  }
};
