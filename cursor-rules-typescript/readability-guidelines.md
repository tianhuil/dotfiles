# Readability Guidelines

## Core Principal

Human readability is (almost) as important as machine-readability

## Prefer to reduce nesting in functions
```ts
// ✅ Correct
function process(data: Data) {
  if (!shouldProcess(data)) return;

  const cleaned = clean(data);
  return computeResult(cleaned);
}

// ❌ Incorrect
function process(data: Data) {
  if (shouldProcess(data)) {
    const cleaned = clean(data);
    return computeResult(cleaned);
  }
}

## Prefer to flatten compound conditionals

```ts
// ✅ Correct
if (a && b) {
  return 1;
} else if (a && !b) {
  return 2;
} else if (!a && b) {
  return 3;
} else {
  return 4;
}

// ❌ Incorrect
if (a) {
  if (b) {
    return 1;
  } else {
    return 2;
  }
} else {
  if (b) {
    return 3;
  } else {
    return 4;
  }
}
```

## Handle base or error cases early

```ts
// ✅ Correct
if (!user) throw new Error("No user found");

if (user.friends.length === 0) return 0;

return computeFriendStats(user);

// ❌ Incorrect
if (user) {
  if (user.friends.length !== 0) {
    return computeFriendStats(user);
  } else {
    return 0;
  }
} else {
  throw new Error("No user found");
}
```

## Extract inner logic into well-named functions

```ts
// ✅ Correct
function processOrders(orders: Order[]) {
  if (orders.length === 0) return [];

  return orders.map(processSingleOrder);
}

function processSingleOrder(order: Order) {
  const total = calculateTotal(order.items);
  const discount = applyDiscount(order.customerType, total);
  return { ...order, total, discount };
}

// ❌ Incorrect
function processOrders(orders: Order[]) {
  if (orders.length === 0) return [];

  return orders.map(order => {
    const total = order.items.reduce((sum, item) => sum + item.price, 0);
    let discount = 0;
    if (order.customerType === 'premium') {
      discount = total * 0.2;
    } else if (order.customerType === 'standard') {
      discount = total * 0.1;
    }
    return { ...order, total, discount };
  });
}
```
