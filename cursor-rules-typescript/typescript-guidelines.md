# Typescript Guidelines

## Core Principal

We prefer Strong Type Safety and Functional Code.

## Strict typing

- No `any` allowed.  Use `unknown` if we must.
- Typescript safe mode enabled
- noImplicitAny enabled

```ts
// ✅ Correct
function processUser(user: User) {
  return user.name;
}

// ❌ Incorrect
function processUser(user: any) {
  return user.name;
}

// ✅ Correct - if we know these are the only fruits we will use
type Fruit = type Fruit = 'Apple' | 'Pear' | 'Banana'

// ❌ Incorrect
type Fruit = string
```

## Prefer `Map` to `Object.fromEntries` when creating dynamically

- Because `Map.get(...)` automatically understands it may be `undefined`.

```ts
const fruitCount = [
  ['apple', 5],
  ['banana', 3]
]

// ✅ Correct
const fruitCountMap = new Map<string, number>(fruitCount);

// ❌ Incorrect
const fruitCountMap = Object.fromEntries(fruitCount)
```

## Prefer `array.at(2)` to using `array[2]` for dynamic length arrays; the former is automatically can be undefined

```ts
// ✅ Correct
const firstUser = allUsers.at(0)


// ❌ Incorrect
const firstUser = allUsers[0]
```

## Prefer narrowly typed discriminated unions

- See [https://github.com/microsoft/TypeScript/wiki/Performance#preferring-interfaces-over-intersections]

```ts
// ✅ Correct
type Application = VirginiaApplication | OhioApplication

interface VirginiaApplication {
  state: 'Virginia',
  ssnLast4: string
}

interface OhioApplication {
  state: 'Ohio',
  photoIdBase64: string
}

// ❌ Incorrect
interface Application {
  state: 'string',
  ssnLast4?: string
  photoIdBase64?: string
}
```

## Prefer `interface` over `type` for typechecking performance

- Exception: when doing type unions or other syntax that `interface doesn't support`

```ts
// ✅ Correct
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ Incorrect
type User = {
  id: string;
  name: string;
  email: string;
};
```

## Prefer String Literals over Enums

```ts
// ✅ Correct
type UserRole = 'admin' | 'user' | 'guest';

// ❌ Incorrect
enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}
```

## Named Exports Only

- No default exports

```ts
// ✅ Correct
export const foo = 2;

// ❌ Incorrect
export default function bar = 2;
}
```

## Optional Chaining Over &&

- Use optional chaining for null/undefined checks
- Clearer intent and better type safety

```ts
// ✅ Correct
const userName = user?.name;
const userAddress = user?.address?.street;

// ❌ Incorrect
const userName = user && user.name;
const userAddress = user && user.address && user.address.street;
```

## Function Design

- Keep functions small and single-purpose
- Extract complex logic into well-named helper functions

```ts
// ✅ Correct
const validateUser = (user: User) => {
  if (!isValidName(user.name)) return false;
  if (!isValidEmail(user.email)) return false;
  if (!isValidAge(user.age)) return false;
  return true;
};

const isValidName = (name: string) => {
  return name.length >= 2 && /^[a-zA-Z\s]*$/.test(name);
};

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidAge = (age: number) => {
  return age >= 18 && age <= 120;
};

// ❌ Incorrect
const validateUser = (user: User) => {
  if (user.name.length < 2 || !/^[a-zA-Z\s]*$/.test(user.name)) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) return false;
  if (user.age < 18 || user.age > 120) return false;
  return true;
};
```

## Clear Variable Names

- Use descriptive, intention-revealing names
- Avoid abbreviations unless common
  
```ts
// ✅ Correct
const isUserActive = user.status === 'active';
const hasRequiredPermissions = user.permissions.includes('admin');
const userDisplayName = user.name || 'Anonymous';

// ❌ Incorrect
const active = user.status === 'active';
const hasPerm = user.permissions.includes('admin');
const udn = user.name || 'Anonymous';

// ✅ correct
const Comp = React.FC<{ icon: ReactNode, text: string }> => <div>
  ...
  {icon}
  ...
  <span>{string}</span>
  ...
</div>

const SpecialComp = () => <Comp icon={IconX} text='this is special'/>
const NotSpecialComp = () => <Comp icon={IconY} text='this is not special'/>

// ❌ Incorrect
const Comp = React.FC<{ isSpecial: boolean}> => <div>
  ...
  {isSpecial ? <IconX> : <IconY>}
  ...
  <span>this is {!isSpecial ? 'not' : '' } special</span>
  ...
</div>
```

## Use `Set` to check for membership

```ts
// ✅ Correctly - probably O(n) time (much faster!)
const todoSet = new Set(doneTodoIds) // it's faster even after building the Set
return todos.map(todo => <Todo ... done={todoSet.has(todo.id)}/>)

// ❌ Incorrect - takes O(n^2) time
const doneTodoIds: string[]
return todos.map(todo => <Todo ... done={doneTodoIds.some(id === todo.id)}/>)
```

## Prefer `const` over `function` for component and utility declarations

```ts
// ✅ Correct
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
}

// ❌ Incorrect
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
```

## Prefer function syntax for iterators

```ts
// ✅ Correct
async function* streamValues(): AsyncGenerator<number, void, void> {
  for (let i = 0; i < 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    yield i;
  }
}

// ❌ Incorrect
const streamValues = (): AsyncIterable<number> => ({
  [Symbol.asyncIterator]: async function* (): AsyncGenerator<number, void, void> {
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      yield i;
    }
  }
});
```
