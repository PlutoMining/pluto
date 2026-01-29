import * as React from 'react';

type AnyProps = Record<string, any>;

function passthrough(name: string) {
  return function Component(props: AnyProps) {
    const { children, ...rest } = props ?? {};
    return (
      <div data-recharts={name} data-testid={`recharts-${name.toLowerCase()}`} {...rest}>
        {children}
      </div>
    );
  };
}

export const ResponsiveContainer = passthrough('ResponsiveContainer');
export const PieChart = passthrough('PieChart');
export const LineChart = passthrough('LineChart');
export const BarChart = passthrough('BarChart');
export const AreaChart = passthrough('AreaChart');
export const CartesianGrid = passthrough('CartesianGrid');
export const XAxis = passthrough('XAxis');
export const YAxis = passthrough('YAxis');
export const Legend = passthrough('Legend');
export const Cell = passthrough('Cell');

export function Tooltip(props: AnyProps) {
  return <div data-recharts="Tooltip" data-testid="recharts-tooltip" {...(props ?? {})} />;
}

export function Pie(props: AnyProps) {
  const { children, onMouseEnter, ...rest } = props ?? {};
  return (
    <div
      data-recharts="Pie"
      data-testid="recharts-pie"
      onMouseEnter={() => {
        onMouseEnter?.({}, 1);
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Line(props: AnyProps) {
  return <div data-recharts="Line" data-testid="recharts-line" {...(props ?? {})} />;
}

export function Bar(props: AnyProps) {
  return <div data-recharts="Bar" data-testid="recharts-bar" {...(props ?? {})} />;
}

export function Area(props: AnyProps) {
  return <div data-recharts="Area" data-testid="recharts-area" {...(props ?? {})} />;
}

export function Treemap(props: AnyProps) {
  const { children, ...rest } = props ?? {};
  return (
    <div data-recharts="Treemap" data-testid="recharts-treemap" {...rest}>
      {children}
    </div>
  );
}
