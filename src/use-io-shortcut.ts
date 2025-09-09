// 快捷键记录和处理系统
class ShortcutRecorder {
  currentKeys: Set<number>;
  shortcutSequence: any[];
  mouseDownTime: Map<number, number>;
  longPressThreshold: number;
  onUpdate: (shortcut: any) => void;
  // 记录按键按下的时间，用于检测双击，键为keycode，值为时间数组
  keyPressTimes: Map<number, number[]>;
  // 两次按键按下的最大时间间隔（毫秒）
  doublePressThreshold: number;

  constructor(onUpdate: (shortcut: any) => void) {
    // 存储当前按下的按键
    this.currentKeys = new Set();
    // 存储当前记录的快捷键序列
    this.shortcutSequence = [];
    // 存储鼠标按下的时间，用于判断长按/短按
    this.mouseDownTime = new Map();
    // 长按的阈值（毫秒）
    this.longPressThreshold = 500;
    this.onUpdate = onUpdate;

    // 初始化按键双击相关配置
    this.keyPressTimes = new Map();
    this.doublePressThreshold = 500; // 两次按键按下间隔小于500ms视为双击
  }

  // 处理输入事件
  handleIO(event: any) {
    const reflect: Record<number, () => void> = {
      4: () => this.handleKeyDown(event), // keydown
      5: () => this.handleKeyUp(event), // keyup
      7: () => this.handleMouseDown(event), // mousedown
      8: () => this.handleMouseUp(event) // mouseup
    };
    reflect[event.type]();
    this.onUpdate(this.formatShortcut('updated'));
  }

  // 处理键盘按下事件
  handleKeyDown(event: any) {
    const { keycode, ctrlKey, altKey } = event;

    // 忽略重复按键
    if (this.currentKeys.has(keycode)) return;

    this.currentKeys.add(keycode);

    // 记录快捷键序列
    this.shortcutSequence.push({
      type: 'key',
      keycode,
      ctrlKey,
      altKey,
      time: event.time,
      isDoublePress: false // 标记是否是双击中的一次
    });
    // 处理按键按下，记录时间用于检测双击
    this.handleKeyPress(keycode, event.time);
  }

  // 处理按键按下，检测双击的情况
  handleKeyPress(keycode: number, currentTime: number) {
    // 获取该按键的历史按下时间，若无则初始化
    let pressTimes = this.keyPressTimes.get(keycode) || [];

    // 清除超过阈值的旧记录
    pressTimes = pressTimes.filter(time => currentTime - time <= this.doublePressThreshold);

    // 添加当前按下时间
    pressTimes.push(currentTime);

    // 更新存储
    this.keyPressTimes.set(keycode, pressTimes);
    // 找到序列中最后两个按键事件
    const keyEvent = this.shortcutSequence.at(-1);
    if (!keyEvent) return;
    // 如果在阈值内有两次按下，标记为双击
    if (pressTimes.length >= 2) {
      keyEvent.isDoublePress = true;
      // 清除记录，避免检测到三次按下时误判
      this.keyPressTimes.set(keycode, []);
    }
  }

  // 处理键盘抬起事件
  handleKeyUp(event: any) {
    const { keycode } = event;

    this.currentKeys.delete(keycode);

    // 检查是否所有按键都已抬起
    if (this.currentKeys.size === 0 && this.mouseDownTime.size === 0) {
      this.finalizeShortcut();
    }
  }

  // 处理鼠标按下事件
  handleMouseDown(event: any) {
    const { button, ctrlKey, altKey } = event;

    // 记录鼠标按下时间
    this.mouseDownTime.set(button, event.time);

    // 记录快捷键序列
    this.shortcutSequence.push({
      type: 'mouse',
      button,
      ctrlKey,
      altKey,
      time: event.time,
      isLongPress: false // 初始标记为短按，后续可能更新
    });
  }

  // 处理鼠标抬起事件
  handleMouseUp(event: any) {
    const { button } = event;

    // 计算按下时长
    const pressTime = this.mouseDownTime.get(button);
    const isLongPress = pressTime ? event.time - pressTime >= this.longPressThreshold : false;

    // 更新序列中鼠标事件的长按标记
    const mouseEventIndex = this.shortcutSequence.findIndex(item => item.type === 'mouse' && item.button === button && !item.isLongPress);

    if (mouseEventIndex !== -1) {
      this.shortcutSequence[mouseEventIndex].isLongPress = isLongPress;
    }

    this.mouseDownTime.delete(button);

    // 检查是否所有按键都已抬起
    if (this.currentKeys.size === 0 && this.mouseDownTime.size === 0) {
      this.finalizeShortcut();
    }
  }

  // 完成快捷键记录并验证
  finalizeShortcut() {
    if (this.validateShortcut()) {
      this.onUpdate(this.formatShortcut('finished')); // 调用外部save函数
    }
    this.resetShortcut();
  }

  // 验证快捷键格式
  validateShortcut() {
    const sequence = this.shortcutSequence;

    // 空序列无效
    if (sequence.length === 0) return false;

    // 检查是否是双击序列
    if (this.isDoublePressSequence(sequence)) return true;

    // 检查每种快捷键类型
    if (this.isModifierKeyCombination(sequence)) return true;
    if (this.isMouseButtonShortcut(sequence)) return true;
    if (this.isModifierMouseCombination(sequence)) return true;
    if (this.isTwoKeySequence(sequence)) return true;

    return false;
  }

  // 验证是否为双击序列
  isDoublePressSequence(sequence: any[]) {
    if (sequence.length !== 1 || sequence[0].type !== 'key') return false;
    const lastEvent = sequence.at(-1);
    return lastEvent?.isDoublePress;
  }

  // 验证是否为Ctrl/Alt与其他按键的组合
  isModifierKeyCombination(sequence: any[]) {
    if (sequence.length < 2 || sequence[0].type !== 'key') return false;

    const { ctrlKey, altKey } = sequence[0];
    // 必须有Ctrl或Alt修饰键
    return ctrlKey || altKey;
  }

  // 验证是否为鼠标快捷键（短按或长按，非左键/右键）
  isMouseButtonShortcut(sequence: any[]) {
    if (sequence.length !== 1 || sequence[0].type !== 'mouse') return false;
    const { button, isLongPress } = sequence[0];
    // 不能是左键或右键短按
    if (button === 1 && !isLongPress) return false;
    if (button === 2 && !isLongPress) return false;
    return true;
  }

  // 验证是否为Ctrl/Alt与鼠标的组合
  isModifierMouseCombination(sequence: any[]) {
    if (sequence.length !== 2 || sequence[1].type !== 'mouse') return false;
    const { ctrlKey, altKey } = sequence[0];
    // 必须有Ctrl或Alt修饰键
    return ctrlKey || altKey;
  }

  // 验证是否为两个非修饰键的序列
  isTwoKeySequence(sequence: any[]) {
    if (sequence.length !== 2 || sequence[0].type !== 'key' || sequence[1].type !== 'key') return false;

    const firstKey = sequence[0];
    const secondKey = sequence[1];

    // 第一个键不能是Ctrl或Alt
    if (firstKey.ctrlKey || firstKey.altKey) return false;

    // 两个键必须不同
    return firstKey.keycode !== secondKey.keycode;
  }

  // 重置快捷键记录
  resetShortcut() {
    this.currentKeys.clear();
    this.shortcutSequence = [];
    this.mouseDownTime.clear();
  }

  // 格式化快捷键显示
  formatShortcut(status: 'finished' | 'updated') {
    const sequence = this.shortcutSequence;
    const getLabel = () => {
      if (this.isDoublePressSequence(sequence)) {
        // 双击单独处理
        return `双击${this.getKeyName(this.shortcutSequence.at(-1)?.keycode)}`;
      }
      return this.shortcutSequence
        .map(item => {
          if (item.type === 'key') {
            // 将keycode转换为实际按键名称
            return this.getKeyName(item.keycode);
          } else {
            const buttonName = [null, '左键', '右键', '中键'][item.button] || `Button${item.button}`;
            const pressType = item.isLongPress ? '长按' : '短按';
            return `${buttonName}${pressType}`;
          }
        })
        .join(' → ');
    };
    return {
      label: getLabel(),
      sequence: this.shortcutSequence,
      status
    };
  }

  // 将keycode转换为按键名称
  getKeyName(keycode: number) {
    // UiohookKey按键映射
    const keyMap = {
      1: 'Escape',
      2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
      12: 'Minus', 13: 'Equal', 14: 'Backspace', 15: 'Tab', 16: 'Q', 17: 'W', 18: 'E', 19: 'R',
      20: 'T', 21: 'Y', 22: 'U', 23: 'I', 24: 'O', 25: 'P', 26: 'BracketLeft', 27: 'BracketRight',
      28: 'Enter', 29: 'Ctrl', 30: 'A', 31: 'S', 32: 'D', 33: 'F', 34: 'G', 35: 'H', 36: 'J',
      37: 'K', 38: 'L', 39: 'Semicolon', 40: 'Quote', 41: 'Backquote', 42: 'Shift', 43: 'Backslash',
      44: 'Z', 45: 'X', 46: 'C', 47: 'V', 48: 'B', 49: 'N', 50: 'M', 51: 'Comma', 52: 'Period',
      53: 'Slash', 54: 'ShiftRight', 55: 'NumpadMultiply', 56: 'Alt', 57: 'Space', 58: 'CapsLock',
      59: 'F1', 60: 'F2', 61: 'F3', 62: 'F4', 63: 'F5', 64: 'F6', 65: 'F7', 66: 'F8', 67: 'F9',
      68: 'F10', 69: 'NumLock', 70: 'ScrollLock', 71: 'Numpad7', 72: 'Numpad8', 73: 'Numpad9',
      74: 'NumpadSubtract', 75: 'Numpad4', 76: 'Numpad5', 77: 'Numpad6', 78: 'NumpadAdd', 79: 'Numpad1',
      80: 'Numpad2', 81: 'Numpad3', 82: 'Numpad0', 83: 'NumpadDecimal', 87: 'F11', 88: 'F12',
      91: 'F13', 92: 'F14', 93: 'F15', 99: 'F16', 100: 'F17', 101: 'F18', 102: 'F19', 103: 'F20',
      104: 'F21', 105: 'F22', 106: 'F23', 107: 'F24', 3613: 'CtrlRight', 3637: 'NumpadDivide',
      3639: 'PrintScreen', 3640: 'AltRight', 3655: 'Home', 3657: 'PageUp', 3663: 'End', 3665: 'PageDown',
      3666: 'Insert', 3667: 'Delete', 3675: 'Meta', 3676: 'MetaRight',
      57416: 'ArrowUp', 57419: 'ArrowLeft', 57421: 'ArrowRight', 57424: 'ArrowDown'
    };

    return keyMap[keycode as keyof typeof keyMap] || `Key${keycode}`;
  }
}

export function useIOShortcutRecorder(onUpdate: (shortcut: any) => void) {
  const recorder = new ShortcutRecorder(onUpdate);
  return recorder;
}
