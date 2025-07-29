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
    const modalRadioButtons = document.querySelectorAll('input[name="attendanceStatus"]');
    const saveDayStatusBtn = document.getElementById('saveDayStatus');
    const cancelDayStatusBtn = document.getElementById('cancelDayStatus');
    const closeButton = document.querySelector('.close-button');

    // Toast Notification Container
    const toastContainer = document.getElementById('toastContainer');

    let currentDate = new Date(); // Stores the currently displayed month/year
    // attendanceData stores data structured by month: {'YYYY-MM': {'YYYY-MM-DD': {fullDay: true, halfDay: false, ot: true, leave: false}}}
    const attendanceDataByMonth = JSON.parse(localStorage.getItem('attendanceDataByMonth')) || {};

    // Rates
    const FULL_DAY_RATE = 400;
    const HALF_DAY_RATE = 200;
    const OT_RATE = 500;

    let selectedDayForModal = null; // To store the date clicked for the modal

    // --- Core Calendar Rendering ---
    function renderCalendar() {
        // Add fade-in animation class
        calendarGrid.classList.remove('fade-in');
        void calendarGrid.offsetWidth; // Trigger reflow to restart animation
        calendarGrid.classList.add('fade-in');

        calendarGrid.innerHTML = ''; // Clear previous calendar
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-indexed month
        const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

        currentMonthYearElem.textContent = new Date(year, month).toLocaleString('th-TH', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0); // Last day of current month
        const daysInMonth = lastDayOfMonth.getDate();

        // Add day headers (อาทิตย์, จันทร์, etc.)
        const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.classList.add('day-header');
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Add empty cells for the days before the first day of the month
        const startDay = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('day', 'empty');
            calendarGrid.appendChild(emptyDay);
        }

        // Initialize month data if not exists
        if (!attendanceDataByMonth[currentMonthKey]) {
            attendanceDataByMonth[currentMonthKey] = {};
        }
        const currentMonthData = attendanceDataByMonth[currentMonthKey];

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.classList.add('day');

            const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const today = new Date();

            // Highlight today
            if (fullDate === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`) {
                dayElem.classList.add('today');
            }

            // Highlight weekends
            const dayOfWeek = new Date(year, month, i).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday (0) or Saturday (6)
                dayElem.classList.add('weekend');
            }

            // Get current attendance status for the day from the current month's data
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
        addDayClickListener(); // Attach click listeners to new day elements
        updateSummaryForCurrentMonth(); // Update summary for the currently displayed month
        populateMonthSelector(); // Update month selector options
        populateJumpSelectors(); // Update year/month jump selectors
    }

    // --- Event Listeners for Day Click (to open Modal) ---
    function addDayClickListener() {
        document.querySelectorAll('.day-content').forEach(dayContent => {
            // Remove existing listener to prevent duplicates
            dayContent.removeEventListener('click', openDayDetailModal);
            dayContent.addEventListener('click', openDayDetailModal);
        });
    }

    function openDayDetailModal(event) {
        selectedDayForModal = event.currentTarget.dataset.date;
        modalDateElem.textContent = new Date(selectedDayForModal).toLocaleString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const monthKey = selectedDayForModal.substring(0, 7);
        const dayData = attendanceDataByMonth[monthKey]?.[selectedDayForModal] || {fullDay: false, halfDay: false, ot: false, leave: false};

        // Set radio button based on current data
        if (dayData.fullDay) {
            document.querySelector('input[name="attendanceStatus"][value="full-day"]').checked = true;
        } else if (dayData.halfDay) {
            document.querySelector('input[name="attendanceStatus"][value="half-day"]').checked = true;
        } else if (dayData.ot) { // If OT is checked but no day status, select OT (though usually OT is with full/half)
             document.querySelector('input[name="attendanceStatus"][value="ot"]').checked = true;
        } else if (dayData.leave) {
            document.querySelector('input[name="attendanceStatus"][value="leave"]').checked = true;
        } else {
            document.querySelector('input[name="attendanceStatus"][value="none"]').checked = true;
        }
        
        // This is a special case: OT can be selected with full/half day.
        // If a day is full/half/leave, and also has OT, make sure OT is also shown as an option.
        // For simplicity, in this modal, we're only selecting ONE status. 
        // A more complex modal could use checkboxes for full/half/leave and a separate checkbox for OT.
        // For now, if OT is checked, we default to showing it in the radio, but if full/half/leave is also checked,
        // the radio button structure means only one can be shown as selected initially.
        // The save logic below will correctly handle combining them.

        dayDetailModal.style.display = 'flex'; // Show modal
    }

    // --- Modal Actions ---
    saveDayStatusBtn.addEventListener('click', () => {
        const date = selectedDayForModal;
        const monthKey = date.substring(0, 7);
        
        // Get the selected value from the radio buttons
        const selectedStatus = document.querySelector('input[name="attendanceStatus"]:checked').value;

        // Reset all statuses for the day first
        attendanceDataByMonth[monthKey][date] = {
            fullDay: false,
            halfDay: false,
            ot: false,
            leave: false
        };

        // Set the chosen status
        if (selectedStatus === 'full-day') {
            attendanceDataByMonth[monthKey][date].fullDay = true;
        } else if (selectedStatus === 'half-day') {
            attendanceDataByMonth[monthKey][date].halfDay = true;
        } else if (selectedStatus === 'ot') {
            attendanceDataByMonth[monthKey][date].ot = true;
        } else if (selectedStatus === 'leave') {
            attendanceDataByMonth[monthKey][date].leave = true;
        } 
        // If 'none', all are already false

        localStorage.setItem('attendanceDataByMonth', JSON.stringify(attendanceDataByMonth));
        renderCalendar(); // Re-render to update the day status indicators
        dayDetailModal.style.display = 'none'; // Hide modal
        showToast('บันทึกข้อมูลเรียบร้อย!');
    });

    cancelDayStatusBtn.addEventListener('click', () => {
        dayDetailModal.style.display = 'none'; // Hide modal
    });

    closeButton.addEventListener('click', () => {
        dayDetailModal.style.display = 'none'; // Hide modal
    });

    // Close modal if clicked outside of content
    window.addEventListener('click', (event) => {
        if (event.target == dayDetailModal) {
            dayDetailModal.style.display = 'none';
        }
    });


    // --- Summary Calculations ---
    function updateSummaryForMonth(yearMonth, summaryElem) {
        let fullDayCount = 0;
        let halfDayCount = 0;
        let otCount = 0;
        let leaveCount = 0; // New: Leave count
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
            if (data.leave) { // Count leave days
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
        // No separate leave display in main summary, but it's calculated
        totalAmountElem.textContent = summary.totalAmount.toLocaleString('th-TH');
    }

    // --- Month & Year Navigation ---
    function populateJumpSelectors() {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 5; // Show 5 years back
        const endYear = currentYear + 5;   // Show 5 years forward

        yearSelector.innerHTML = '';
        for (let y = startYear; y <= endYear; y++) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearSelector.appendChild(option);
        }
        yearSelector.value = currentDate.getFullYear();

        monthJumpSelector.innerHTML = '';
        for (let m = 0; m < 12; m++) {
            const option = document.createElement('option');
            option.value = m; // 0-indexed month
            option.textContent = new Date(currentYear, m).toLocaleString('th-TH', { month: 'long' });
            monthJumpSelector.appendChild(option);
        }
        monthJumpSelector.value = currentDate.getMonth();
    }

    yearSelector.addEventListener('change', () => {
        currentDate.setFullYear(parseInt(yearSelector.value));
        renderCalendar();
    });

    monthJumpSelector.addEventListener('change', () => {
        currentDate.setMonth(parseInt(monthJumpSelector.value));
        renderCalendar();
    });

    goToCurrentMonthBtn.addEventListener('click', () => {
        currentDate = new Date(); // Reset to today's month/year
        renderCalendar();
    });

    // --- Monthly Summary Dropdown ---
    function populateMonthSelector() {
        monthSelector.innerHTML = ''; // Clear existing options
        const sortedMonths = Object.keys(attendanceDataByMonth).sort().reverse(); // Sort descending

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
            // Format for display (e.g., "กรกฎาคม 2568")
            const [year, monthNum] = monthKey.split('-');
            option.textContent = new Date(year, parseInt(monthNum) - 1).toLocaleString('th-TH', { month: 'long', year: 'numeric' });
            monthSelector.appendChild(option);
        });

        // Set the selector to the currently displayed month if it exists in options
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        if (sortedMonths.includes(currentMonthKey)) {
            monthSelector.value = currentMonthKey;
        } else if (sortedMonths.length > 0) {
            monthSelector.value = sortedMonths[0]; // Select the latest available month
        } else {
            monthSelector.value = ""; // No data, no selection
        }
        displaySelectedMonthSummary(); // Display summary for the initially selected month
    }

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

        // Show the toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10); // Small delay to allow CSS transition

        // Hide and remove the toast
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
            currentDate = new Date(); // Reset current month to today
            renderCalendar(); // Re-render calendar to reflect cleared data
            updateSummaryForCurrentMonth(); // Update summary to 0
            populateMonthSelector(); // Re-populate selector (should be empty now)
            showToast('ข้อมูลถูกรีเซ็ตเรียบร้อยแล้ว!');
        }
    });

    renderCalendar(); // Initial render on page load
});
