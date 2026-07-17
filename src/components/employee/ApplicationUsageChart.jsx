import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const ApplicationUsageChart = ({ data }) => {
    // data format: { "Chrome": 120, "VS Code": 300 } (seconds)

    const chartData = useMemo(() => {
        const labels = Object.keys(data);
        const values = Object.values(data).map(v => (v / 60).toFixed(1)); // Convert seconds to minutes for display

        // Generate random colors nicely
        const bgColors = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
        ];

        return {
            labels,
            datasets: [
                {
                    label: 'Usage Time (Minutes)',
                    data: values,
                    backgroundColor: bgColors.slice(0, labels.length),
                    borderColor: bgColors.slice(0, labels.length).map(c => c.replace('0.7', '1')),
                    borderWidth: 1,
                },
            ],
        };
    }, [data]);

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    boxWidth: 15,
                    font: { size: 11 }
                }
            },
            title: {
                display: true,
                text: 'Session Application Usage',
            },
        },
    };

    if (Object.keys(data).length === 0) {
        return <div className="text-center text-muted py-4 small">No data yet. Start working to see stats.</div>;
    }

    return (
        <div style={{ height: '300px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Pie data={chartData} options={options} />
        </div>
    );
};

export default ApplicationUsageChart;
