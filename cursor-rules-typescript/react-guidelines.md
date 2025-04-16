# React Guidelines

## Prefer react components to as `const` with type explicitly typed `React.FC`

```ts
// ✅ Correct
const ButtonComp: React.FC<ButtonProps> = ({...}) => { ... }
```

## Prefer to name components `*Comp` with props named `*Props`

```ts
// ✅ Correct
interface ButtonProps = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
};

const ButtonComp: React.FC<ButtonProps>
```

## Prefer to use `return` even in single-line components

- Makes it easier to convert to multiline

```ts
// ✅ Correct
const ButtonComp: React.FC = ({...}) => { 
    return <button/>;
}

// ❌ Incorrect
const ButtonComp: React.FC = ({...}) => (<button/>)
```

## Prop Naming

- Use clear, descriptive prop names
- Follow React conventions (onClick, isActive, etc.)

```ts
// ✅ Correct
type ButtonProps = {
  onClick: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
};

// ❌ Incorrect
type ButtonProps = {
  clickHandler: () => void;
  disabled?: boolean;
  loading?: boolean;
};
```

## Prop Destructuring

- Destructure props with proper typing

```ts
// ✅ Correct
const Button: React.FC<ButtonProps> = ({ onClick, isDisabled, children }) => {
  return (
    <button onClick={onClick} disabled={isDisabled}>
      {children}
    </button>
  );
};

// ❌ Incorrect
const Button: React.FC<ButtonProps> = (props) => {
  return (
    <button onClick={props.onClick} disabled={props.isDisabled}>
      {props.children}
    </button>
  );
};
```
