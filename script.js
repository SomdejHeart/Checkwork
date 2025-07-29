// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthYearElem = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const fullDayCountElem = document.getElementById('fullDayCount');
    const halfDayCountElem = document.getElementById('halfDayCount');
    const otCountElem = document.getElementById('otCount');
    const totalAmountElem = document.getElementById('totalAmount');
    const resetDataBtn = document.getElementById('resetData');
    const monthSelector = document.getElementById('monthSelector');
    const selectedMonthSummaryElem = document.getElementById('selectedMonthSummary');
    const yearSelector = document.getElementById('yearSelector');
    const monthJumpSelector = document.getElementById('monthJumpSelector');
    const goToCurrentMonthBtn = document.getElementById('goToCurrentMonth');

    // Modal elements
    const dayDetailModal = document.getElementById('dayDetailModal');
    const modalDateElem = document.getElementById('modalDate');
    const attendanceTypeCheckboxes = document.querySelectorAll('input[name="attendanceType"]');
    const saveDayStatusBtn = document.getElementById('saveDayStatus');
    const cancelDayStatusBtn = document.getElementById('cancelDayStatus');
    const closeButton = document.querySelector('.close-button');

    // Toast Notification Container
    const toastContainer = document.getElementById('toastContainer');

    let currentDate = new Date();
    const attendanceDataByMonth = JSON.parse(localStorage.getItem('attendanceDataByMonth')) || {};

    const FULL_DAY_RATE = 400;
    const HALF_DAY_RATE = 200;
    const OT_RATE = 500;

    let selectedDayForModal = null;

    // --- Core Calendar Rendering ---
    function renderCalendar() {
        calendarGrid.classList.remove('fade-in');
        void calendarGrid.offsetWidth;
        calendarGrid.classList.add('fade-in');

        calendarGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

        currentMonthYearElem.textContent = new Date(year, month).toLocaleString('th-TH', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();

        const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.classList.add('day-header');
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        const startDay = firstDayOfMonth.getDay();
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('day', 'empty');
            calendarGrid.appendChild(emptyDay);
        }

        if (!attendanceDataByMonth[currentMonthKey]) {
            attendanceDataByMonth[currentMonthKey] = {};
        }
        const currentMonthData = attendanceDataByMonth[currentMonthKey];

        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.classList.add('day');

            const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const today = new Date();

            if (fullDate === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`) {
                dayElem.classList.add('today');
            }

            const dayOfWeek = new Date(year, month, i).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                dayElem.classList.add('weekend');
            }

            const dayAttendance = currentMonthData[fullDate] || {};

            let statusIndicatorsHTML = '';
            if (dayAttendance.fullDay) statusIndicatorsHTML += '<span>☀️</span>';
            if (dayAttendance.halfDay) statusIndicatorsHTML += '<span>🌤️</span>';
            if (dayAttendance.ot) statusIndicatorsHTML += '<span>⚡</span>';
            if (dayAttendance.leave) statusIndicatorsHTML += '<span>🌴</span>';


            dayElem.innerHTML = `
                <div class="day-content" data-date="${fullDate}">
                    <div class="day-number">${i}</div>
                    <div class="day-status-indicators">${statusIndicatorsHTML}</div>
                </div>
            `;
            calendarGrid.appendChild(dayElem);
        }
        addDayClickListener();
        updateSummaryForCurrentMonth();
        populateMonthSelector();
        populateJumpSelectors(); // Ensure these are updated with current month/year
    }

    // --- Event Listeners for Day Click (to open Modal) ---
    function addDayClickListener() {
        document.querySelectorAll('.day-content').forEach(dayContent => {
            dayContent.removeEventListener('click', openDayDetailModal);
            dayContent.addEventListener('click', openDayDetailModal);
        });
    }

    function openDayDetailModal(event) {
        selectedDayForModal = event.currentTarget.dataset.date;
        modalDateElem.textContent = new Date(selectedDayForModal).toLocaleString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const monthKey = selectedDayForModal.substring(0, 7);
        const dayData = attendanceDataByMonth[monthKey]?.[selectedDayForModal] || {fullDay: false, halfDay: false, ot: false, leave: false};

        attendanceTypeCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            if (dayData[checkbox.value]) {
                checkbox.checked = true;
            }
        });
        
        const hasAnyStatus = dayData.fullDay || dayData.halfDay || dayData.ot || dayData.leave;
        document.querySelector('input[name="attendanceType"][value="none"]').checked = !hasAnyStatus;

        dayDetailModal.style.display = 'flex';
    }

    // --- Modal Actions ---
    saveDayStatusBtn.addEventListener('click', () => {
        const date = selectedDayForModal;
        const monthKey = date.substring(0, 7);
        
        if (!attendanceDataByMonth[monthKey]) {
            attendanceDataByMonth[monthKey] = {};
        }
        
        const newDayData = {
            fullDay: false,
            halfDay: false,
            ot: false,
            leave: false
        };

        let selectedNone = false;
        attendanceTypeCheckboxes.forEach(checkbox => {
            if (checkbox.value === 'none') {
                selectedNone = checkbox.checked;
            } else {
                newDayData[checkbox.value] = checkbox.checked;
            }
        });

        if (selectedNone) {
            attendanceDataByMonth[monthKey][date] = {
                fullDay: false,
                halfDay: false,
                ot: false,
                leave: false
            };
        } else {
            if (newDayData.fullDay && newDayData.halfDay) {
                newDayData.halfDay = false;
            }
            if (newDayData.leave) {
                newDayData.fullDay = false;
                newDayData.halfDay = false;
            }

            attendanceDataByMonth[monthKey][date] = newDayData;
        }
        
        localStorage.setItem('attendanceDataByMonth', JSON.stringify(attendanceDataByMonth));
        renderCalendar();
        dayDetailModal.style.display = 'none';
        showToast('บันทึกข้อมูลเรียบร้อย!');
    });


    cancelDayStatusBtn.addEventListener('click', () => {
        dayDetailModal.style.display = 'none';
    });

    closeButton.addEventListener('click', () => {
        dayDetailModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == dayDetailModal) {
            dayDetailModal.style.display = 'none';
        }
    });

    // Event listener for 'None' checkbox to make it exclusive
    document.querySelector('input[name="attendanceType"][value="none"]').addEventListener('change', (event) => {
        if (event.target.checked) {
            attendanceTypeCheckboxes.forEach(checkbox => {
                if (checkbox.value !== 'none') {
                    checkbox.checked = false;
                }
            });
        }
    });

    // Event listener for other checkboxes to uncheck 'None'
    document.querySelectorAll('input[name="attendanceType"]:not([value="none"])').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            if (event.target.checked) {
                document.querySelector('input[name="attendanceType"][value="none"]').checked = false;
            } else {
                const anyOtherChecked = Array.from(attendanceTypeCheckboxes).some(cb => cb.checked && cb.value !== 'none');
                if (!anyOtherChecked) {
                    document.querySelector('input[name="attendanceType"][value="none"]').checked = true;
                }
            }
        });
    });


    // --- Summary Calculations ---
    function updateSummaryForMonth(yearMonth, summaryElem) {
        let fullDayCount = 0;
        let halfDayCount = 0;
        let otCount = 0;
        let leaveCount = 0;
        let totalAmount = 0;

        const monthData = attendanceDataByMonth[yearMonth] || {};

        for (const date in monthData) {
            const data = monthData[date];
            if (data.fullDay) {
                fullDayCount++;
                totalAmount += FULL_DAY_RATE;
            } else if (data.halfDay) {
                halfDayCount++;
                totalAmount += HALF_DAY_RATE;
            }
            if (data.ot) {
                otCount++;
                totalAmount += OT_RATE;
            }
            if (data.leave) {
                leaveCount++;
            }
        }

        if (summaryElem) {
            summaryElem.innerHTML = `
                <p>มาทำงานเต็มวัน: <span>${fullDayCount}</span> วัน</p>
                <p>มาทำงานครึ่งวัน: <span>${halfDayCount}</span> วัน</p>
                <p>OT: <span>${otCount}</span> วัน</p>
                <p>วันลา: <span>${leaveCount}</span> วัน</p>
                <p>ยอดเงินรวม: <span>${totalAmount.toLocaleString('th-TH')}</span> บาท</p>
            `;
        }
        return { fullDayCount, halfDayCount, otCount, leaveCount, totalAmount };
    }

    function updateSummaryForCurrentMonth() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const summary = updateSummaryForMonth(currentMonthKey);
        
        fullDayCountElem.textContent = summary.fullDayCount;
        halfDayCountElem.textContent = summary.halfDayCount;
        otCountElem.textContent = summary.otCount;
        totalAmountElem.textContent = summary.totalAmount.toLocaleString('th-TH');
    }

    // --- Month & Year Navigation ---
    function populateJumpSelectors() {
        const today = new Date();
        const currentYear = today.getFullYear();
        const startYear = currentYear - 5;
        const endYear = currentYear + 5;

        yearSelector.innerHTML = '';
        for (let y = startYear; y <= endYear; y++) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearSelector.appendChild(option);
        }
        // Set year selector to the current displayed year
        yearSelector.value = currentDate.getFullYear();

        monthJumpSelector.innerHTML = '';
        for (let m = 0; m < 12; m++) {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = new Date(currentYear, m).toLocaleString('th-TH', { month: 'long' });
            monthJumpSelector.appendChild(option);
        }
        // Set month selector to the current displayed month
        monthJumpSelector.value = currentDate.getMonth();
    }

    // Event Listeners for Month Navigation Buttons (FIXED)
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    yearSelector.addEventListener('change', () => {
        currentDate.setFullYear(parseInt(yearSelector.value));
        renderCalendar();
    });

    monthJumpSelector.addEventListener('change', () => {
        currentDate.setMonth(parseInt(monthJumpSelector.value));
        renderCalendar();
    });

    goToCurrentMonthBtn.addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    // --- Monthly Summary Dropdown ---
    function populateMonthSelector() {
        monthSelector.innerHTML = '';
        const sortedMonths = Object.keys(attendanceDataByMonth).sort().reverse();

        if (sortedMonths.length === 0) {
            monthSelector.innerHTML = '<option value="">ไม่มีข้อมูล</option>';
            selectedMonthSummaryElem.innerHTML = '<p>ยังไม่มีข้อมูลบันทึกในเดือนใดๆ</p>';
            monthSelector.disabled = true;
            return;
        }

        monthSelector.disabled = false;
        
        sortedMonths.forEach(monthKey => {
            const option = document.createElement('option');
            option.value = monthKey;
            const [year, monthNum] = monthKey.split('-');
            option.textContent = new Date(year, parseInt(monthNum) - 1).toLocaleString('th-TH', { month: 'long', year: 'numeric' });
            monthSelector.appendChild(option);
        });

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        if (sortedMonths.includes(currentMonthKey)) {
            monthSelector.value = currentMonthKey;
        } else if (sortedMonths.length > 0) {
            monthSelector.value = sortedMonths[0];
        } else {
            monthSelector.value = "";
        }
        displaySelectedMonthSummary();
    }

    monthSelector.addEventListener('change', displaySelectedMonthSummary);


    function displaySelectedMonthSummary() {
        const selectedMonthKey = monthSelector.value;
        if (selectedMonthKey) {
            updateSummaryForMonth(selectedMonthKey, selectedMonthSummaryElem);
        } else {
            selectedMonthSummaryElem.innerHTML = '<p>กรุณาเลือกเดือนเพื่อดูสรุป</p>';
        }
    }

    // --- Toast Notification Function ---
    function showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.classList.add('toast');
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, duration);
    }

    // --- Reset Data ---
    resetDataBtn.addEventListener('click', () => {
        if (confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้!')) {
            localStorage.removeItem('attendanceDataByMonth');
            Object.keys(attendanceDataByMonth).forEach(key => delete attendanceDataByMonth[key]);
            currentDate = new Date();
            renderCalendar();
            updateSummaryForCurrentMonth();
            populateMonthSelector();
            showToast('ข้อมูลถูกรีเซ็ตเรียบร้อยแล้ว!');
        }
    });

    // Initial render on page load
    renderCalendar();
});
