// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event
  
  switch (action) {
    case 'random':
      return await getRandomQuestion(data)
    case 'sequence':
      return await getSequenceQuestion(data)
    case 'points':
      return await getPoints()
    case 'exam':
      return await getExamQuestions(data)
    case 'progress':
      return await recordProgress(data)
    default:
      return { code: 400, msg: '未知操作' }
  }
}

// 获取随机题目
async function getRandomQuestion(data) {
  const { point, excludeIds = [] } = data || {}
  
  let query = db.collection('questions')
  if (point) {
    query = query.where({ point })
  }
  if (excludeIds.length > 0) {
    query = query.where({ _id: _.nin(excludeIds) })
  }
  
  // 随机获取一题
  const countResult = await query.count()
  const total = countResult.total
  if (total === 0) {
    return { code: 404, msg: '没有找到题目' }
  }
  
  const skip = Math.floor(Math.random() * total)
  const result = await query.skip(skip).limit(1).get()
  
  return {
    code: 200,
    msg: 'success',
    data: result.data[0]
  }
}

// 获取顺序题目
async function getSequenceQuestion(data) {
  const { id } = data || {}
  
  if (id) {
    const result = await db.collection('questions').doc(id).get()
    return { code: 200, msg: 'success', data: result.data }
  }
  
  // 获取第一题
  const result = await db.collection('questions').limit(1).get()
  return { code: 200, msg: 'success', data: result.data[0] }
}

// 获取考点列表
async function getPoints() {
  const result = await db.collection('questions')
    .field({ point: true })
    .get()
  
  // 统计各考点数量
  const pointMap = {}
  result.data.forEach(item => {
    const point = item.point || '未分类'
    pointMap[point] = (pointMap[point] || 0) + 1
  })
  
  const points = Object.entries(pointMap).map(([name, count]) => ({
    name,
    count
  }))
  
  return { code: 200, msg: 'success', data: points }
}

// 获取考试题目
async function getExamQuestions(data) {
  const { count = 50 } = data || {}
  
  const result = await db.collection('questions')
    .limit(count)
    .get()
  
  return { code: 200, msg: 'success', data: result.data }
}

// 记录刷题进度
async function recordProgress(data) {
  const { questionId, isCorrect } = data || {}
  const wxContext = cloud.getWXContext()
  
  await db.collection('progress').add({
    data: {
      questionId,
      isCorrect,
      userId: wxContext.OPENID,
      createdAt: db.serverDate()
    }
  })
  
  // 如果答错，加入错题本
  if (!isCorrect) {
    await db.collection('wrong_questions').add({
      data: {
        questionId,
        userId: wxContext.OPENID,
        createdAt: db.serverDate()
      }
    })
  }
  
  return { code: 200, msg: 'success' }
}
