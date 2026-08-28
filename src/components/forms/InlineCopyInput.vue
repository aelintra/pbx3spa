<script setup>
defineProps({
  id: {
    type: String,
    required: true
  },
  value: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: undefined
  },
  disabled: {
    type: Boolean,
    default: false
  },
  /** Brief checkmark after a successful copy */
  copied: {
    type: Boolean,
    default: false
  },
  copyLabel: {
    type: String,
    default: 'Copy'
  },
  inputTitle: {
    type: String,
    default: 'Immutable'
  }
})

defineEmits(['copy'])
</script>

<template>
  <div class="inline-copy" :class="{ 'inline-copy--copied': copied }">
    <input
      :id="id"
      class="inline-copy-input value-immutable"
      :type="type"
      :value="value"
      :placeholder="placeholder"
      readonly
      :title="inputTitle"
    />
    <button
      type="button"
      class="inline-copy-btn"
      :disabled="disabled"
      :aria-label="copied ? 'Copied' : copyLabel"
      :title="copied ? 'Copied' : copyLabel"
      @click="$emit('copy')"
    >
      <!-- check -->
      <svg
        v-if="copied"
        class="inline-copy-icon"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
      >
        <path
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M3.5 8.5l3 3 6-7"
        />
      </svg>
      <!-- clipboard -->
      <svg
        v-else
        class="inline-copy-icon"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
      >
        <rect
          x="5.5"
          y="1.75"
          width="5"
          height="2.5"
          rx="0.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        />
        <path
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
          d="M6.25 3.5H4.75A1.25 1.25 0 003.5 4.75v8.5A1.25 1.25 0 004.75 14.5h6.5a1.25 1.25 0 001.25-1.25v-8.5A1.25 1.25 0 0011.25 3.5H9.75"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.inline-copy {
  position: relative;
  flex: 1;
  min-width: 0;
  width: 100%;
}

.inline-copy-input {
  display: block;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0.5rem 2.25rem 0.5rem 0.75rem;
  font-size: 0.9375rem;
  font-family: inherit;
  line-height: 1.5;
  border-radius: 0.375rem;
  word-break: break-all;
  box-sizing: border-box;
  color: #94a3b8;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.inline-copy-input:focus {
  outline: none;
}

.inline-copy-btn {
  position: absolute;
  top: 50%;
  right: 0.35rem;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  margin: 0;
  color: #64748b;
  background: transparent;
  border: none;
  border-radius: 0.3rem;
  cursor: pointer;
}

.inline-copy-btn:hover:not(:disabled) {
  color: #0f172a;
  background: rgba(255, 255, 255, 0.85);
}

.inline-copy-btn:focus-visible {
  outline: 2px solid #94a3b8;
  outline-offset: 1px;
}

.inline-copy-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.inline-copy--copied .inline-copy-btn {
  color: #15803d;
}

.inline-copy-icon {
  display: block;
}
</style>
