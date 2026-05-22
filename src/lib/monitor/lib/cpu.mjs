/**
 * Created by ds3783 on 2017/2/17.
 */

import os from 'os';


function getCPUTimes() {
    let cpus = os.cpus();
    let data = [];
    cpuNum = cpus.length;
    for (let i = cpuNum - 1; i >= 0; i--) {
        let times = cpus[i].times;
        data.push({
            idle: times.idle,
            total: times.idle + times.user + times.nice + times.sys + times.irq
        });
    }
    return data;
}

function getCPUUsage(data) {
    if (data.length < 3) {
        return [];
    }
    let first = data[0];
    let second = data[1];
    let third = data[2];
    let usage = [];
    for (let i = 0; i < first.length; i++) {
        let first_idle = first[i].idle;
        let first_total = first[i].total;
        let second_idle = second[i].idle;
        let second_total = second[i].total;
        let third_idle = third[i].idle;
        let third_total = third[i].total;
        let first_usage = 1 - (second_idle - first_idle) / (second_total - first_total);
        let second_usage = 1 - (third_idle - second_idle) / (third_total - second_total);
        let per_usage = (first_usage + second_usage) / 2 * 100;
        usage.push(per_usage.toFixed(1));
    }
    return usage;
}


let usageData = [];
let cpuNum = 0;
let intervals = [];

export default {
    init: function () {
        intervals.push(setInterval(function () {
            usageData.push(getCPUTimes());
            while (usageData.length > 3) {
                usageData.shift();
            }
        }, 500));
    },
    shutdown: function () {
        for (const interval of intervals) {
            clearInterval(interval);
        }
        intervals = [];
    },
    num: function () {
        return os.cpus().length;
    },
    usage: function () {
        return getCPUUsage(usageData);
    },
    usageAvg: function () {
        let usages = getCPUUsage(usageData);
        let sum = 0;
        let len = usages.length;
        for (let i = 0; i < len; i++) {
            sum += usages[i] * 1;
        }
        return len > 0 ? sum / len : 0;
    }
};
