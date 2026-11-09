function applyJsonTransform(schema) {
  const transform = (doc, ret) => {
    ret.id = ret._id ? String(ret._id) : undefined;
    if (ret.user_id !== undefined && ret.user_id !== null) {
      ret.user_id = String(ret.user_id);
    }
    if (ret.test_id !== undefined && ret.test_id !== null) {
      ret.test_id = String(ret.test_id);
    }
    if (ret.plan_id !== undefined && ret.plan_id !== null) {
      ret.plan_id = String(ret.plan_id);
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  };

  schema.set('toJSON', { virtuals: true, transform });
  schema.set('toObject', { virtuals: true, transform });
}

module.exports = { applyJsonTransform };
