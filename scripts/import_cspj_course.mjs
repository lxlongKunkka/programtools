/**
 * 导入 CSPJ 专题复习课程
 * 用法: node scripts/import_cspj_course.mjs
 */
import mongoose from 'mongoose'
import { appConn } from '../server/db.js'
import CourseLevel from '../server/models/CourseLevel.js'

// CSPJ 专题课程数据
const cspjCourseData = {
  level: 100,  // 设置一个较大的 level 值，避免冲突
  group: 'CSPJ专题复习',
  label: 'CSPJ 专题复习',
  subject: 'C++',
  title: 'CSP-J 提高组专题复习课程',
  description: 'CSP-J（Junior）提高组算法竞赛专题复习课程，涵盖模拟、枚举、字符串、排序、数学基础、动态规划、图论等核心知识点',
  editors: [],
  topics: [
    {
      title: '专题01：模拟·枚举·字符串·排序',
      description: '基础算法思维训练，包括模拟、枚举、字符串处理和基本排序算法',
      chapters: []
    },
    {
      title: '专题02：数学基础·STL容器',
      description: '竞赛数学基础知识和 C++ STL 标准模板库的使用',
      chapters: []
    },
    {
      title: '专题03：前缀和·差分',
      description: '前缀和与差分算法的原理与应用',
      chapters: []
    },
    {
      title: '专题04：二分·高精化',
      description: '二分查找算法和高精度计算',
      chapters: []
    },
    {
      title: '专题05：递推·递归·二进制枚举',
      description: '递推与递归思想，二进制状态枚举技巧',
      chapters: []
    },
    {
      title: '专题06：双指针·贪心',
      description: '双指针技巧和贪心算法设计',
      chapters: []
    },
    {
      title: '专题07：栈·队列·链表',
      description: '基础数据结构：栈、队列、链表的实现与应用',
      chapters: []
    },
    {
      title: '专题08：BFS·宽度优先·图上BFS',
      description: '广度优先搜索算法及其在图论中的应用',
      chapters: []
    },
    {
      title: '专题09：DFS·树基础',
      description: '深度优先搜索和树的基础知识',
      chapters: []
    },
    {
      title: '专题10：DP入门（线性DP）',
      description: '动态规划入门，线性 DP 问题',
      chapters: []
    },
    {
      title: '专题11：DP背包（0-1·完全）',
      description: '背包问题：0-1 背包和完全背包',
      chapters: []
    },
    {
      title: '专题12：区间DP·DP综合练习',
      description: '区间动态规划和综合练习',
      chapters: []
    },
    {
      title: '专题13：最短路径（Dijkstra·Floyd）',
      description: '最短路径算法：Dijkstra 和 Floyd-Warshall',
      chapters: []
    },
    {
      title: '专题14：基础补漏·综合复习3',
      description: '查漏补缺，综合复习巩固',
      chapters: []
    },
    {
      title: '专题15：全真模拟·解析',
      description: 'CSP-J 全真模拟测试及详细解析',
      chapters: []
    }
  ]
}

async function importCourse() {
  try {
    console.log('🚀 开始导入 CSPJ 专题复习课程...')
    
    // 检查是否已存在
    const existing = await CourseLevel.findOne({ 
      group: cspjCourseData.group,
      level: cspjCourseData.level 
    })
    
    if (existing) {
      console.log('⚠️  课程已存在，正在更新...')
      await CourseLevel.findByIdAndUpdate(existing._id, cspjCourseData)
      console.log('✅ 课程更新成功！')
    } else {
      const newCourse = new CourseLevel(cspjCourseData)
      await newCourse.save()
      console.log('✅ 课程创建成功！')
    }
    
    console.log('\n📊 课程信息:')
    console.log(`   标题: ${cspjCourseData.title}`)
    console.log(`   分组: ${cspjCourseData.group}`)
    console.log(`   专题数量: ${cspjCourseData.topics.length}`)
    console.log('\n📝 专题列表:')
    cspjCourseData.topics.forEach((topic, index) => {
      console.log(`   ${index + 1}. ${topic.title}`)
    })
    
    console.log('\n✨ 导入完成！请访问课程管理页面查看和编辑。')
    
  } catch (error) {
    console.error('❌ 导入失败:', error)
    throw error
  } finally {
    await mongoose.connection.close()
  }
}

// 运行导入
importCourse()
