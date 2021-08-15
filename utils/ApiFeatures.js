class ApiFeatures {
  constructor(model, reqQuery) {
    this.model = model;
    this.reqQuery = reqQuery;
  }

  filter() {
    //1. filtering
    let query = { ...this.reqQuery };
    const excluded = ['page', 'sort', 'limit', 'fields'];
    excluded.forEach(el => delete query[el]);
    query = JSON.stringify(query).replace(
      /\b(gt|gte|lt|lte|in)\b/,
      match => `$${match}`
    );
    this.model = this.model.find(JSON.parse(query));
    return this;
  }

  sorting() {
    //2. sorting
    if (this.reqQuery.sort) {
      const sortBy = this.reqQuery.sort.split(',').join(' ');
      this.model = this.model.sort(sortBy);
    } else {
      this.model = this.model.sort('-createdAt');
    }
    return this;
  }

  limiting() {
    //3. fields limiting
    if (this.reqQuery.fields) {
      const field = this.reqQuery.fields.split(',').join(' ');
      this.model = this.model.select(field);
    } else {
      this.model = this.model.select('-__v');
    }
    return this;
  }

  paginate() {
    //4 pagination
    const page = this.reqQuery.page * 1 || 1;
    const limit = this.reqQuery.limit * 1 || 10;
    const skip = (page - 1) * limit;
    this.model = this.model.skip(skip).limit(limit);
    return this;
  }
}

module.exports = ApiFeatures;
