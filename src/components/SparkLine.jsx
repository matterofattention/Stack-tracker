import { ResponsiveContainer, LineChart, Line } from 'recharts'

export default function SparkLine({ prices, positive }) {
  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={prices.slice(-30)}>
        <Line
          type="monotone"
          dataKey="price"
          dot={false}
          stroke={positive ? '#22c55e' : '#ef4444'}
          strokeWidth={1.5}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
