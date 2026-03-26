// 云函数入口文件 - 错题本相关
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  
  switch (action) {
    case 'list':
      return await getWrongList(userId)
    case 'add':
      return await addWrongQuestion(userId, data)
    case 'remove':
      return await removeWrongQuestion(userId, data)
    case 'updateNote':
      return await updateNote(userId, data)
    default:
      return { code: 400, msg: '未知操作' }
  }
}

// 获取错题列表
async function getWrongList(userId) {
  const result = await db.collection('wrong_questions')
    .where({ userId })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()
  
  // 获取题目详情
  const questionIds = result.data.map(item => item.questionId)
  const questions = await db.collection('questions')
    .where({ _id: _.in(questionIds) })
    .get()
  
  const questionMap = {}
  questions.data.forEach(q => {
    questionMap[q._id] = q
  })
  
  const list = result.data.map(item => ({
    ...item,
    question: questionMap[item.questionId]
  }))
  
  return { code: 200, msg: 'success', data: list }
}

// 添加错题
async function addWrongQuestion(userId, data) {
  const { questionId, userAnswer } = data
  
  // 检查是否已存在
  const exist = await db.collection('wrong_questions')
    .where({ userId, questionId })
    .count()
  
  if (exist.total > 0) {
    return { code: 200, msg: '已存在' }
  }
  
  await db.collection('wrong_questions').add({
    data: {
      questionId,
      userAnswer,
      userId,
      note: '',
      reviewCount: 0,
      createdAt: db.serverDate()
    }
  })
  
  return { code: 200, msg: 'success' }
}

// 移除错题
async function removeWrongQuestion(userId, data) {
  const { questionId } = data
  
  const result = await db.collection('wrong_questions')
    .where({ userId, questionId })
    .remove()
  
  return { code: 200, msg: 'success', data: result }
}

// 更新笔记
async function updateNote(userId, data) {
  const { questionId, note } = data
  
  await db.collection('wrong_questions')
    .where({ userId, questionId })
    .update({
      data: { note }
    })
  
  return { code: 200, msg: 'success' }
}
