# await-to-tuple

Go 风格的错误处理库，让 TypeScript/JavaScript 的异步和同步错误处理更加优雅。

```typescript
// 告别 try-catch
const [ok, err, user] = await to(fetchUser(id));
if (!ok) {
  console.error(err.message);
  return;
}
console.log(user.name);
```

## 特性

- 🎯 **类型安全** - 完整的 TypeScript 支持，自动类型收窄
- 🪶 **零依赖** - 无外部依赖，极小的包体积
- 🌳 **Tree-shakeable** - 按需导入，未使用的功能不会打包
- 🔄 **统一模式** - 异步和同步操作使用相同的 `[ok, err, data]` 模式

## 安装

```bash
npm install await-to-tuple
# or
pnpm add await-to-tuple
# or
yarn add await-to-tuple
```

## 快速开始

### 异步操作

```typescript
import { to } from 'await-to-tuple';

async function getUser(id: string) {
  const [ok, err, user] = await to(fetchUser(id));
  
  if (!ok) {
    // TypeScript 知道 err 是 SafeError，user 是 null
    console.error('获取用户失败:', err.message);
    return null;
  }
  
  // TypeScript 知道 err 是 null，user 是 User 类型
  return user;
}
```

### 同步操作

```typescript
import { sync } from 'await-to-tuple';

function parseConfig(json: string) {
  const [ok, err, config] = sync(() => JSON.parse(json));
  
  if (!ok) {
    console.error('解析失败:', err.message);
    return getDefaultConfig();
  }
  
  return config;
}
```

### 回调风格转换

```typescript
import { cb } from 'await-to-tuple';

const [ok, err, data] = await cb((done) => {
  fs.readFile('config.json', 'utf8', done);
});
```

## API

### 核心函数

#### `to(promise, errorTransformer?)`

包装 Promise，返回 `[ok, err, data]` 三元组。

```typescript
const [ok, err, data] = await to(fetch('/api/users'));
```

别名: `go`, `safeAwait`

#### `sync(fn, errorTransformer?)`

包装同步函数，返回 `[ok, err, data]` 三元组。

```typescript
const [ok, err, data] = sync(() => JSON.parse(str));
```

别名: `safeCall`

#### `cb(fn, errorTransformer?)`

将 Node.js 风格的回调函数转换为返回 SafeResult 的 Promise。

```typescript
const [ok, err, data] = await cb((done) => fs.readFile(path, done));
```

### 工具函数

#### `or(result, defaultValue)`

获取成功值或返回默认值。

```typescript
const name = or(result, 'anonymous');
```

别名: `unwrapOr`

#### `map(result, fn)`

转换成功结果的数据，失败时原样返回。

```typescript
const nameResult = map(userResult, user => user.name);
```

#### `pipe(initial, ...fns)`

链式执行多个异步操作，在首个错误处短路。

```typescript
const [ok, err, saved] = await pipe(
  userId,
  fetchUser,
  validateUser,
  saveUser
);
```

别名: `safePipe`

#### `format(result)` / `parse(str)`

格式化和解析 SafeResult，用于调试。

```typescript
format([true, null, 42]);  // '[OK] data: 42'
parse('[OK] data: 42');    // [true, null, 42]
```

### 自定义错误转换

```typescript
class ApiError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

const [ok, err, data] = await to(
  fetch('/api'),
  (e) => new ApiError(500, String(e))
);
// err 的类型是 ApiError
```

## 类型定义

```typescript
type SuccessResult<T> = [true, null, T];
type ErrorResult<E> = [false, E, null];
type SafeResult<T, E = SafeError> = SuccessResult<T> | ErrorResult<E>;
```

## 为什么选择 await-to-tuple?

### 对比 try-catch

```typescript
// ❌ try-catch 方式
let user: User | undefined;
try {
  user = await fetchUser(id);
} catch (e) {
  console.error(e);
  return;
}
// user 可能是 undefined

// ✅ await-to-tuple 方式
const [ok, err, user] = await to(fetchUser(id));
if (!ok) {
  console.error(err.message);
  return;
}
// user 类型明确是 User
```

### 对比其他库

- **await-to-js**: 返回 `[err, data]`，无法区分 `data` 为 `undefined` 和操作失败
- **await-to-tuple**: 返回 `[ok, err, data]`，通过 `ok` 明确区分成功/失败

## License

MIT
