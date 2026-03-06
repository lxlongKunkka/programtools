<template>
  <div class="editor-form">
    <div class="editor-header">
      <h2>{{ group._id ? '编辑分组' : '新建分组' }}</h2>
    </div>

    <div class="form-group">
      <label>分组名称 (ID):</label>
      <input v-model="group.name" class="form-input" placeholder="例如: C++基础"
             :disabled="!!group._id || !canEdit">
      <span class="hint" v-if="group._id">分组ID不可修改，请修改显示标题。</span>
    </div>

    <div class="form-group">
      <label>显示标题:</label>
      <input v-model="group.title" class="form-input" placeholder="例如: C++ 基础课程"
             :disabled="!canEdit">
    </div>

    <div class="form-group">
      <label>编程语言:</label>
      <select v-model="group.language" class="form-input" :disabled="!canEdit">
        <option v-for="lang in languageOptions" :key="lang" :value="lang">{{ lang }}</option>
      </select>
    </div>

    <div class="form-group" v-if="isAdmin">
      <label>允许编辑的教师:</label>
      <div class="checkbox-list" v-if="teachers.length > 0">
        <label v-for="teacher in teachers" :key="teacher._id" class="checkbox-item">
          <input type="checkbox" :value="teacher._id" v-model="group.editors">
          {{ teacher.uname }}
        </label>
      </div>
      <div v-else class="hint">暂无教师账号可选</div>
      <div class="hint" style="margin-top: 5px; font-size: 12px; color: #888;">
        注意: 列表仅显示角色为"教师"的用户。如果某用户既是高级用户又是教师, 请在后台将其角色设置为"教师" (教师默认拥有高级用户权限)。
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GroupEditor',
  props: {
    group:           { type: Object,  required: true },
    isAdmin:         { type: Boolean, default: false },
    canEdit:         { type: Boolean, default: false },
    teachers:        { type: Array,   default: () => [] },
    languageOptions: { type: Array,   default: () => ['C++', 'Python'] }
  }
}
</script>
