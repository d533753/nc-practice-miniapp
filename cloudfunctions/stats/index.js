// 云函数入口文件 - 统计相关
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  
  switch (action) {
    case 'stats':
      return await getStats()
    case 'userStats':
      return await getUserStats(wxContext.OPENID)
    default:
      return { code: 400, msg: '未知操作' }
  }
}

// 获取题目统计
async function getStats() {
  const questionsCount = await db.collection('questions').count()
  const singleChoiceCount = await db.collection('questions')
    .where({ type: 'single-choice' })
    .count()
  const judgmentCount = await db.collection('questions')
    .where({ type: 'judgment' })
    .count()
  
  return {
    code: 200,
    msg: 'success',
    data: {
      totalCount: questionsCount.total,
      singleChoice: singleChoiceCount.total,
      judgment: judgmentCount.total
    }
  }
}

// 获取用户统计
async function getUserStats(userId) {
  const wrongCount = await db.collection('wrong_questions')
    .where({ userId })
    .count()
  const progressCount = await db.collection('progress')
    .where({ userId })
    .count()
  const correctCount = await db.collection('progress')
    .where({ userId, isCorrect: true })
    .count()
  
  return {
    code: 200,
    msg: 'success',
    data: {
      wrongCount: wrongCount.total,
      totalCount: progressCount.total,
      correctCount: correctCount.total,
      accuracy: progressCount.total > 0 
        ? Math.round(correctCount.total / progressCount.total * 100) + '%'
        : '0%'
    }
  }
}
