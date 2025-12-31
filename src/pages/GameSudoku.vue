<script setup>
import SudokuBoard from '../components/SudokuBoard.vue';
</script>

<template>
  <div class="sudoku-page">
    <SudokuBoard />
  </div>
</template>

<style scoped>
.sudoku-page {
  width: 100%;
  min-height: 100vh;
  background-color: #eaf2f8;
}
</style>
