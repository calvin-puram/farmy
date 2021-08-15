const axios = require('axios');
const AppError = require('./appError');

module.exports = async accesstoken => {
  try {
    const { data } = await axios({
      url: 'https://graph.facebook.com/me',
      method: 'get',
      params: {
        fields: ['id', 'email', 'first_name', 'last_name', 'picture'].join(','),
        access_token: accesstoken
      }
    });

    return data;
  } catch (err) {
    return new AppError(err.response.data.error.message, 400);
  }
};
