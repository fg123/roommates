<template>
    <mdc-card>
            <mdc-card-primary-action>
                <div style="padding: 1rem;">
                    <h2 class="mdc-typography--headline6 no-margin">{{ expense_group.name }}</h2>
                    <h3 class="mdc-typography--body2 no-margin">Last modified on {{ toDateString(expense_group.last_modified) }}</h3>
                </div>
                <mdc-card-media>
                    <canvas ref="canvas"></canvas>
                </mdc-card-media>
                <mdc-card-text>
                    <mdc-list dense>
                        <mdc-list-item v-for="member in nameOwing" :key="member.id">
                            <i slot="start-detail" class="material-icons" :style="'color: ' + member.color">brightness_1</i>
                            <mdc-text>{{ member.name }}</mdc-text>
                            <mdc-chip-set slot="end-detail">
                                <mdc-chip
                                    :class="{ 'chip-red': member.owing > 0,
                                            'chip-green': member.owing < 0 }">
                                        ${{ Math.abs(member.owing).toFixed(2) }}
                                </mdc-chip>
                            </mdc-chip-set>
                        </mdc-list-item>
                    </mdc-list>
                </mdc-card-text>
            </mdc-card-primary-action>
        </mdc-card>
</template>

<script>
import axios from 'axios';
import Chart from 'chart.js';
import 'chartjs-plugin-labels';
import date from '../../date.js';

export default {
    name: 'expense-group-card',
    props: {
        group: Object, // Roommate Group (where we can match user names)
        expense_group: Object,
    },
    data() {
        return {
            nameOwing: []
        }
    },
    methods: {
        toDateString: date.toDateString
    },
    mounted() {
        const colors = ["#5DA5DA", "#FAA43A", "#60BD68","#F17CB0",
            "#B2912F", "#B276B2", "#DECF3F", "#F15854", "#4D4D4D"];
        this.group.members.forEach(item => this.nameOwing.push({ id: item.id, name: item.name}));
        for (let i = 0; i < this.nameOwing.length; i++) {
            const item = this.nameOwing[i];
            if (this.expense_group.owing.hasOwnProperty(item.id)) {
                item.owing = this.expense_group.owing[item.id];
            } else {
                item.owing = 0;
            }
            item.color = colors[i % colors.length];
        }
        const ctx = this.$refs.canvas.getContext('2d');
        Chart.plugins.register({
            beforeDraw: function(chartInstance) {
                var ctx = chartInstance.chart.ctx;
                ctx.fillStyle = '#212121';
                ctx.fillRect(0, 0, chartInstance.chart.width, chartInstance.chart.height);
            }
        });
        Chart.defaults.global.defaultFontColor = 'white';
        Chart.defaults.global.defaultFontSize = '11';
        Chart.defaults.global.defaultFontFamily = 'Roboto';
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.nameOwing.map(member => member.name),
                datasets: [{
                    data: this.nameOwing.map(member => -member.owing),
                    backgroundColor: this.nameOwing.map(member => member.color)
                }]
            },
            options: {
                maintainAspectRatio: false,
                legend: {
                    display: false,
                },
                tooltips: {
                    display: false
                },
                hover: {
                    display: false
                },
                events: [],
                layout: {
                    padding: {
                        top: 40,
                        left: 10,
                        right: 10,
                        bottom: 10
                    }
                },
                plugins: {
                    labels: {
                        render: 'value',
                        fontColor: 'white',
                        position: 'inside',
                        precision: 2,
                        render: function (args) {
                            return '$' + args.value.toFixed(2);
                        }
                    }
                }
            }
        });
    }
}
</script>

<style scoped>
.no-margin {
    margin: 0px!important;
}

.chip-green {
    background-color: #60BD68;
    color: #FFFFFF!important;
}

.chip-red {
    background-color: #F15854;
    color: #FFFFFF!important;
}

.mdc-list-item {
    padding: 0px;
}

.mdc-card__supporting-text:last-child {
    padding-bottom: 8px;
}
</style>

<style>
span.mdc-list-item__graphic {
    margin-right: 16px!important;
}
</style>

