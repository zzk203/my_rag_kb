# Python 编程语言介绍

## 简介

Python 是一种高级编程语言，由 Guido van Rossum 于 1991 年创建。Python 以其简洁的语法和强大的功能而闻名，广泛应用于Web开发、数据科学、人工智能、自动化等领域。

## 主要特点

### 简洁易学
Python 的语法设计强调可读性和简洁性，使用缩进来表示代码块，而不是大括号或关键字。

### 跨平台
Python 可以在 Windows、Linux、macOS 等多种操作系统上运行。

### 丰富的库
Python 拥有庞大的标准库和第三方库生态系统，包括：
- NumPy、Pandas：数据处理
- TensorFlow、PyTorch：深度学习
- Flask、Django：Web 开发
- requests、BeautifulSoup：网络爬虫

## 基本语法

### 变量和数据类型
```python
name = "Alice"
age = 25
is_student = True
scores = [90, 85, 92]
```

### 函数定义
```python
def greet(name):
    return f"Hello, {name}!"

result = greet("World")
print(result)
```

### 类和对象
```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def say_hello(self):
        return f"Hello, I'm {self.name}"
```

## 应用领域

1. **Web 开发**：Django、Flask 框架
2. **数据科学**：数据分析、可视化
3. **机器学习**：TensorFlow、scikit-learn
4. **自动化脚本**：批量处理、测试自动化
5. **游戏开发**：Pygame 等游戏库
