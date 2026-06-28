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
      chapters: [
        { id: '1-1', title: '第1章：模拟算法基础', content: '', problemIds: [] },
        { id: '1-2', title: '第2章：枚举方法与技巧', content: '', problemIds: [] },
        { id: '1-3', title: '第3章：字符串处理', content: '', problemIds: [] },
        { id: '1-4', title: '第4章：排序算法', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题02：数学基础·STL容器',
      description: '竞赛数学基础知识和 C++ STL 标准模板库的使用',
      chapters: [
        { id: '2-1', title: '第1章：数论基础（质数、约数、GCD）', content: '', problemIds: [] },
        { id: '2-2', title: '第2章：组合数学', content: '', problemIds: [] },
        { id: '2-3', title: '第3章：STL容器：vector、set、map', content: '', problemIds: [] },
        { id: '2-4', title: '第4章：STL算法库', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题03：前缀和·差分',
      description: '前缀和与差分算法的原理与应用',
      chapters: [
        { id: '3-1', title: '第1章：一维前缀和', content: '', problemIds: [] },
        { id: '3-2', title: '第2章：二维前缀和', content: '', problemIds: [] },
        { id: '3-3', title: '第3章：差分数组', content: '', problemIds: [] },
        { id: '3-4', title: '第4章：综合应用', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题04：二分·高精化',
      description: '二分查找算法和高精度计算',
      chapters: [
        { id: '4-1', title: '第1章：二分查找原理', content: '', problemIds: [] },
        { id: '4-2', title: '第2章：二分答案', content: '', problemIds: [] },
        { id: '4-3', title: '第3章：高精度加减法', content: '', problemIds: [] },
        { id: '4-4', title: '第4章：高精度乘除法', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题05：递推·递归·二进制枚举',
      description: '递推与递归思想，二进制状态枚举技巧',
      chapters: [
        { id: '5-1', title: '第1章：递推关系', content: '', problemIds: [] },
        { id: '5-2', title: '第2章：递归思想', content: '', problemIds: [] },
        { id: '5-3', title: '第3章：二进制枚举', content: '', problemIds: [] },
        { id: '5-4', title: '第4章：状态压缩', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题06：双指针·贪心',
      description: '双指针技巧和贪心算法设计',
      chapters: [
        { id: '6-1', title: '第1章：双指针技巧', content: '', problemIds: [] },
        { id: '6-2', title: '第2章：贪心算法基础', content: '', problemIds: [] },
        { id: '6-3', title: '第3章：贪心策略证明', content: '', problemIds: [] },
        { id: '6-4', title: '第4章：经典贪心问题', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题07：栈·队列·链表',
      description: '基础数据结构：栈、队列、链表的实现与应用',
      chapters: [
        { id: '7-1', title: '第1章：栈的实现与应用', content: '', problemIds: [] },
        { id: '7-2', title: '第2章：队列与双端队列', content: '', problemIds: [] },
        { id: '7-3', title: '第3章：单调栈与单调队列', content: '', problemIds: [] },
        { id: '7-4', title: '第4章：链表基础', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题08：BFS·宽度优先·图上BFS',
      description: '广度优先搜索算法及其在图论中的应用',
      chapters: [
        { id: '8-1', title: '第1章：BFS 基本原理', content: '', problemIds: [] },
        { id: '8-2', title: '第2章：网格图 BFS', content: '', problemIds: [] },
        { id: '8-3', title: '第3章：图的存储与遍历', content: '', problemIds: [] },
        { id: '8-4', title: '第4章：多源 BFS', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题09：DFS·树基础',
      description: '深度优先搜索和树的基础知识',
      chapters: [
        { id: '9-1', title: '第1章：DFS 搜索策略', content: '', problemIds: [] },
        { id: '9-2', title: '第2章：回溯与剪枝', content: '', problemIds: [] },
        { id: '9-3', title: '第3章：树的基本概念', content: '', problemIds: [] },
        { id: '9-4', title: '第4章：树的遍历', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题10：DP入门（线性DP）',
      description: '动态规划入门，线性 DP 问题',
      chapters: [
        { id: '10-1', title: '第1章：动态规划思想', content: '', problemIds: [] },
        { id: '10-2', title: '第2章：最长上升子序列', content: '', problemIds: [] },
        { id: '10-3', title: '第3章：最长公共子序列', content: '', problemIds: [] },
        { id: '10-4', title: '第4章：线性 DP 综合', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题11：DP背包（0-1·完全）',
      description: '背包问题：0-1 背包和完全背包',
      chapters: [
        { id: '11-1', title: '第1章：01背包问题', content: '', problemIds: [] },
        { id: '11-2', title: '第2章：完全背包问题', content: '', problemIds: [] },
        { id: '11-3', title: '第3章：多重背包', content: '', problemIds: [] },
        { id: '11-4', title: '第4章：背包问题变形', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题12：区间DP·DP综合练习',
      description: '区间动态规划和综合练习',
      chapters: [
        { id: '12-1', title: '第1章：区间 DP 基础', content: '', problemIds: [] },
        { id: '12-2', title: '第2章：经典区间 DP 问题', content: '', problemIds: [] },
        { id: '12-3', title: '第3章：DP 优化技巧', content: '', problemIds: [] },
        { id: '12-4', title: '第4章：DP 综合练习', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题13：最短路径（Dijkstra·Floyd）',
      description: '最短路径算法：Dijkstra 和 Floyd-Warshall',
      chapters: [
        { id: '13-1', title: '第1章：最短路问题', content: '', problemIds: [] },
        { id: '13-2', title: '第2章：Dijkstra 算法', content: '', problemIds: [] },
        { id: '13-3', title: '第3章：Floyd-Warshall 算法', content: '', problemIds: [] },
        { id: '13-4', title: '第4章：最短路应用', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题14：基础补漏·综合复习',
      description: '查漏补缺，综合复习巩固',
      chapters: [
        { id: '14-1', title: '第1章：易错知识点梳理', content: '', problemIds: [] },
        { id: '14-2', title: '第2章：常见题型回顾', content: '', problemIds: [] },
        { id: '14-3', title: '第3章：综合练习1', content: '', problemIds: [] },
        { id: '14-4', title: '第4章：综合练习2', content: '', problemIds: [] }
      ]
    },
    {
      title: '专题15：全真模拟·解析',
      description: 'CSP-J 全真模拟测试及详细解析',
      chapters: [
        { id: '15-1', title: '第1章：模拟赛1', content: '', problemIds: [] },
        { id: '15-2', title: '第2章：模拟赛2', content: '', problemIds: [] },
        { id: '15-3', title: '第3章：模拟赛3', content: '', problemIds: [] },
        { id: '15-4', title: '第4章：赛后总结与提升', content: '', problemIds: [] }
      ]
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
      console.log(`   ${index + 1}. ${topic.title} (${topic.chapters.length} 个章节)`)
    })
    
    const totalChapters = cspjCourseData.topics.reduce((sum, topic) => sum + topic.chapters.length, 0)
    console.log(`\n📖 总章节数: ${totalChapters}`)
    
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
