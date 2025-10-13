import React from 'react'
import { ResponsiveRadar } from '@nivo/radar'

export type RadarDataPoint = {
  metric: string
  [key: string]: string | number
}

interface RadarChartProps {
  data: RadarDataPoint[]
  keys: string[]
}

const RadarChart = ({ data, keys }: RadarChartProps) => {
  return (
    <div className="h-full w-full p-5 bg-white/5 " >
        <ResponsiveRadar
            data={data}
            keys={keys}
            indexBy="metric"
            valueFormat=" >-.2f"
            margin={{ top: 50, right: 50, bottom: 50, left: 80 }}
            borderColor={{ from: 'color' }}
            gridLabelOffset={36}
            dotSize={3}
            dotColor={{ theme: 'background' }}
            dotBorderWidth={2}
            dotBorderColor={{ from: 'color' }}
            colors={{ scheme: 'category10' }}
            fillOpacity={0.25}
            blendMode="multiply"
            animate={true}
            motionConfig="wobbly"
            isInteractive={true}
            theme={{
                background: 'transparent',
                text: {
                    fontSize: 12,
                    fill: '#ffffff',
                    outlineWidth: 0,
                    outlineColor: 'transparent'
                },
                axis: {
                    domain: {
                        line: {
                            stroke: '#ffffff',
                            strokeWidth: 1
                        }
                    },
                    legend: {
                        text: {
                            fontSize: 12,
                            fill: '#ffffff',
                            outlineWidth: 0,
                            outlineColor: 'transparent'
                        }
                    },
                    ticks: {
                        line: {
                            stroke: '#ffffff',
                            strokeWidth: 1
                        },
                        text: {
                            fontSize: 12,
                            fill: '#ffffff',
                            outlineWidth: 0,
                            outlineColor: 'transparent'
                        }
                    }
                },
                grid: {
                    line: {
                        stroke: '#ffffff40',
                        strokeWidth: 1
                    }
                },
                dots: {
                    text: {
                        fontSize: 12,
                        fill: '#ffffff',
                        outlineWidth: 0,
                        outlineColor: 'transparent'
                    }
                },
                tooltip: {
                    container: {
                        background: '#1a1a1a',
                        color: '#ffffff',
                        fontSize: 12,
                        borderRadius: 6,
                        boxShadow: '0 3px 9px rgba(0, 0, 0, 0.5)',
                        border: '1px solid #333333'
                    }
                }
            }}
        />
    </div>
  )
}

export default RadarChart