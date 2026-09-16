const SiteMetric = require('../models/SiteMetric')

const SITE_VIEW_KEY = 'site-views'

async function getSiteViewCount(metricModel = SiteMetric) {
  const metric = await metricModel.findOne({ key: SITE_VIEW_KEY }).select('count').lean()
  return Number(metric?.count || 0)
}

async function incrementSiteViewCount(metricModel = SiteMetric) {
  const metric = await metricModel.findOneAndUpdate(
    { key: SITE_VIEW_KEY },
    {
      $inc: { count: 1 },
      $setOnInsert: { key: SITE_VIEW_KEY },
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )

  return Number(metric.count)
}

module.exports = {
  getSiteViewCount,
  incrementSiteViewCount,
}
