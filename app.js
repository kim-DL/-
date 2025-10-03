/**
 * ErgoDesk - 인체공학 책상 높이 계산기
 * v3.2 Final - 환경 선택 + 체형 보정 근거 표시
 */

// ============================================
// 환경 정의 (Environments)
// ============================================
const ENVIRONMENTS = {
    home: {
        name: '홈오피스',
        shoeCorrection: 0,        // 맨발/실내화
        description: '신발 보정 없음'
    },
    office: {
        name: '사무실',
        shoeCorrection: -2.0,     // 신발 착용
        description: '신발 두께 -2cm'
    }
};

// ============================================
// 체형 프로필 오프셋
// ============================================
const PROFILE_OFFSETS = {
    standard: {
        chair: 0,
        desk: 0,
        monitor: 0
    },
    longLegs: {
        chair: 2.0,
        desk: 0,
        monitor: -0.7
    },
    longTorso: {
        chair: -2.0,
        desk: 1.5,
        monitor: 1.5
    }
};

// 프로필 정보 (UI 표시용)
const PROFILE_INFO = {
    standard: {
        name: '표준',
        description: '평균적인 신체 비율을 기준으로 계산합니다. 추가 보정값이 적용되지 않습니다.'
    },
    longLegs: {
        name: '하체 긴 편',
        description: '하체가 평균보다 길어 슬와부(무릎 뒤) 높이가 높습니다. 의자를 높이고 모니터를 약간 낮춥니다.'
    },
    longTorso: {
        name: '상체 긴 편',
        description: '상체가 평균보다 길어 팔꿈치와 눈높이가 높습니다. 책상과 모니터를 높입니다.'
    }
};

// ============================================
// 인체 비율 상수
// ============================================
const RATIOS = {
    poplitealHeight: 0.245,    // 슬와부 높이 (무릎 뒤)
    elbowRestHeight: 0.135,    // 좌면→팔꿈치 높이
    eyeHeightOffset: 30        // 좌면→눈높이 오프셋 (cm)
};

const ADJUSTMENTS = {
    cushionCompression: 0.5    // 쿠션 압축 보정
};

const TOLERANCE = 1.5;       // 허용 범위 (±1.5cm)
const CHAIR_MIN = 30;        // 의자 최소 높이
const CHAIR_MAX = 60;        // 의자 최대 높이

// ============================================
// 계산 로직
// ============================================

/**
 * 의자 높이 계산
 */
function calculateChairHeight(height, profile = 'standard', environment = 'home') {
    const profileOffset = PROFILE_OFFSETS[profile]?.chair || 0;
    const env = ENVIRONMENTS[environment];

    let chairHeight =
        RATIOS.poplitealHeight * height +
        env.shoeCorrection +
        ADJUSTMENTS.cushionCompression +
        profileOffset;

    // 가드레일 적용
    chairHeight = Math.max(CHAIR_MIN, Math.min(CHAIR_MAX, chairHeight));

    // 0.1cm 단위로 반올림
    return Math.round(chairHeight * 10) / 10;
}

/**
 * 책상 높이 계산
 */
function calculateDeskHeight(height, profile = 'standard', environment = 'home') {
    const chairHeight = calculateChairHeight(height, profile, environment);
    const profileOffset = PROFILE_OFFSETS[profile]?.desk || 0;

    const deskHeight = chairHeight + RATIOS.elbowRestHeight * height + profileOffset;

    return Math.round(deskHeight * 10) / 10;
}

/**
 * 모니터 상단 높이 계산
 */
function calculateMonitorTopHeight(height, profile = 'standard', environment = 'home') {
    const chairHeight = calculateChairHeight(height, profile, environment);
    const profileOffset = PROFILE_OFFSETS[profile]?.monitor || 0;

    const monitorTop =
        chairHeight +
        RATIOS.elbowRestHeight * height +
        RATIOS.eyeHeightOffset +
        profileOffset;

    return Math.round(monitorTop * 10) / 10;
}

/**
 * 허용 범위 계산
 */
function calculateRange(value) {
    return {
        min: Math.round((value - TOLERANCE) * 10) / 10,
        max: Math.round((value + TOLERANCE) * 10) / 10
    };
}

/**
 * 전체 권장값 계산
 */
function calculateAll(height, profile = 'standard', environment = 'home') {
    const chair = calculateChairHeight(height, profile, environment);
    const desk = calculateDeskHeight(height, profile, environment);
    const monitor = calculateMonitorTopHeight(height, profile, environment);

    return {
        chair: { value: chair, range: calculateRange(chair) },
        desk: { value: desk, range: calculateRange(desk) },
        monitor: { value: monitor, range: calculateRange(monitor) }
    };
}

// ============================================
// 상태 관리
// ============================================
const STATE = {
    height: 170.0,
    profile: 'standard',
    environment: 'home'
};

const STORAGE_KEY = 'ergodesk_state_v3';

function loadState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            STATE.height = parsed.height || 170.0;
            STATE.profile = parsed.profile || 'standard';
            STATE.environment = parsed.environment || 'home';
        }
    } catch (e) {
        console.warn('LocalStorage 로드 실패:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
    } catch (e) {
        console.warn('LocalStorage 저장 실패:', e);
    }
}

// ============================================
// DOM 참조
// ============================================
const DOM = {
    heightInput: null,
    heightSlider: null,
    stepperBtns: null,
    profileTabs: null,
    infoTabs: null,
    tabContents: null,
    envOptions: null,
    currentValue: null,
    envStatus: null,
    chairFormula: null,
    shoeDetail: null,
    profileNoteTitle: null,
    profileNoteDesc: null,
    resultNumbers: null,
    resultRanges: null
};

function cacheDOMElements() {
    DOM.heightInput = document.getElementById('height-input');
    DOM.heightSlider = document.getElementById('height-slider');
    DOM.stepperBtns = document.querySelectorAll('.stepper-btn');
    DOM.profileTabs = document.querySelectorAll('.profile-tab');
    DOM.infoTabs = document.querySelectorAll('.info-tab');
    DOM.tabContents = document.querySelectorAll('.tab-content');
    DOM.envOptions = document.querySelectorAll('.env-option');
    DOM.currentValue = document.getElementById('current-value');
    DOM.envStatus = document.getElementById('env-status');
    DOM.chairFormula = document.getElementById('chair-formula');
    DOM.shoeDetail = document.getElementById('shoe-detail');
    DOM.profileNoteTitle = document.getElementById('profile-note-title');
    DOM.profileNoteDesc = document.getElementById('profile-note-desc');

    DOM.resultNumbers = {
        chair: document.querySelector('[data-result="chair"]'),
        desk: document.querySelector('[data-result="desk"]'),
        monitor: document.querySelector('[data-result="monitor"]')
    };

    DOM.resultRanges = {
        chair: document.querySelector('[data-range="chair"]'),
        desk: document.querySelector('[data-range="desk"]'),
        monitor: document.querySelector('[data-range="monitor"]')
    };
}

// ============================================
// 렌더링
// ============================================
let rafId = null;

/**
 * 숫자 카운트업 애니메이션
 */
function animateValue(element, start, end, duration = 300) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic

        const current = start + (end - start) * easeProgress;
        element.textContent = current.toFixed(1);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/**
 * 메인 렌더링 함수
 */
function render() {
    if (rafId) return;

    rafId = requestAnimationFrame(function () {
        const results = calculateAll(STATE.height, STATE.profile, STATE.environment);

        // 결과 숫자 애니메이션
        Object.keys(results).forEach(function (key) {
            const element = DOM.resultNumbers[key];
            if (!element) return;

            const oldValue = parseFloat(element.textContent) || 0;
            const newValue = results[key].value;

            if (Math.abs(newValue - oldValue) > 0.1) {
                animateValue(element, oldValue, newValue);
            } else {
                element.textContent = newValue.toFixed(1);
            }
        });

        // 허용 범위 업데이트
        DOM.resultRanges.chair.textContent =
            `${results.chair.range.min.toFixed(1)}–${results.chair.range.max.toFixed(1)} cm`;
        DOM.resultRanges.desk.textContent =
            `${results.desk.range.min.toFixed(1)}–${results.desk.range.max.toFixed(1)} cm`;
        DOM.resultRanges.monitor.textContent =
            `${results.monitor.range.min.toFixed(1)}–${results.monitor.range.max.toFixed(1)} cm`;

        // 환경 상태 업데이트
        updateEnvironmentInfo();

        // 체형 보정 정보 업데이트
        updateProfileInfo();

        rafId = null;
    });
}

/**
 * 환경 정보 업데이트
 */
function updateEnvironmentInfo() {
    if (!DOM.chairFormula || !DOM.envStatus || !DOM.shoeDetail) return;

    const env = ENVIRONMENTS[STATE.environment];
    const shoeText = env.shoeCorrection === 0 ? '' : ` ${env.shoeCorrection}`;

    DOM.chairFormula.textContent = `신장 × 0.245${shoeText} + 0.5`;
    DOM.envStatus.textContent = `${env.name} (${env.description})`;
    DOM.shoeDetail.innerHTML = env.shoeCorrection === 0
        ? '<strong>신발 보정</strong> = 없음 (홈오피스 모드)'
        : `<strong>신발 보정</strong> = ${env.shoeCorrection}cm (사무실 모드)`;
}

/**
 * 체형 보정 정보 업데이트
 */
function updateProfileInfo() {
    const profileOffset = PROFILE_OFFSETS[STATE.profile];
    const profileData = PROFILE_INFO[STATE.profile];

    // 프로필 노트 업데이트
    if (DOM.profileNoteTitle && DOM.profileNoteDesc) {
        DOM.profileNoteTitle.textContent = `체형 보정: ${profileData.name}`;
        DOM.profileNoteDesc.textContent = profileData.description;
    }

    // 오프셋 값 업데이트 (3개 카드)
    const offsetElements = {
        chair: document.querySelector('[data-offset="chair"]'),
        desk: document.querySelector('[data-offset="desk"]'),
        monitor: document.querySelector('[data-offset="monitor"]')
    };

    Object.keys(offsetElements).forEach(function (key) {
        const element = offsetElements[key];
        if (!element) return;

        const value = profileOffset[key];
        const sign = value > 0 ? '+' : '';
        element.textContent = `${sign}${value.toFixed(1)} cm`;

        // 색상 클래스 적용
        element.classList.remove('positive', 'negative');
        if (value > 0) {
            element.classList.add('positive');
        } else if (value < 0) {
            element.classList.add('negative');
        }
    });

    // 공식 카드 내 오프셋 상세 표시
    const offsetDetails = {
        chair: {
            detail: document.getElementById('chair-offset-detail'),
            text: document.getElementById('chair-offset-text')
        },
        desk: {
            detail: document.getElementById('desk-offset-detail'),
            text: document.getElementById('desk-offset-text')
        },
        monitor: {
            detail: document.getElementById('monitor-offset-detail'),
            text: document.getElementById('monitor-offset-text')
        }
    };

    Object.keys(offsetDetails).forEach(function (key) {
        const { detail, text } = offsetDetails[key];
        if (!detail || !text) return;

        const value = profileOffset[key];

        if (value !== 0) {
            detail.style.display = 'list-item';
            const sign = value > 0 ? '+' : '';
            text.textContent = `${sign}${value.toFixed(1)} cm`;
        } else {
            detail.style.display = 'none';
        }
    });

    // 비교 테이블 행 강조
    const highlightRows = document.querySelectorAll('.highlight-row');
    highlightRows.forEach(function (row) {
        if (row.getAttribute('data-profile') === STATE.profile) {
            row.classList.add('active');
        } else {
            row.classList.remove('active');
        }
    });
}

/**
 * 입력 UI 동기화
 */
function syncInputs() {
    DOM.heightInput.value = STATE.height.toFixed(1);
    DOM.heightSlider.value = STATE.height;
    DOM.currentValue.textContent = `${STATE.height.toFixed(1)} cm`;
}

/**
 * 체형 프로필 탭 동기화
 */
function syncProfileTabs() {
    DOM.profileTabs.forEach(function (tab) {
        const isActive = tab.getAttribute('data-profile') === STATE.profile;
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

/**
 * 환경 버튼 동기화
 */
function syncEnvironment() {
    DOM.envOptions.forEach(function (option) {
        if (option.getAttribute('data-env') === STATE.environment) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// ============================================
// 이벤트 핸들러
// ============================================

/**
 * 신장 유효성 검증
 */
function validateHeight(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    return Math.max(100, Math.min(220, num));
}

/**
 * 신장 변경 핸들러
 */
function handleHeightChange(newValue, skipValidation = false) {
    let finalValue;

    if (skipValidation) {
        finalValue = parseFloat(newValue);
    } else {
        const validated = validateHeight(newValue);
        if (validated === null) return;
        finalValue = validated;
    }

    // 0.1cm 단위로 반올림
    STATE.height = Math.round(finalValue * 10) / 10;

    syncInputs();
    render();
    saveState();
}

/**
 * 스텝퍼 버튼 핸들러
 */
function handleStepper(action) {
    const delta = action === 'increase' ? 0.1 : -0.1;
    handleHeightChange(STATE.height + delta, true);
}

/**
 * 체형 프로필 변경 핸들러
 */
function handleProfileChange(newProfile) {
    if (STATE.profile === newProfile) return;

    STATE.profile = newProfile;
    syncProfileTabs();
    render();
    saveState();
}

/**
 * 환경 변경 핸들러
 */
function handleEnvironmentChange(newEnvironment) {
    if (STATE.environment === newEnvironment) return;

    STATE.environment = newEnvironment;
    syncEnvironment();
    render();
    saveState();
}

/**
 * 정보 탭 전환 핸들러
 */
function handleTabChange(tabName) {
    DOM.infoTabs.forEach(function (tab) {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    DOM.tabContents.forEach(function (content) {
        if (content.getAttribute('data-content') === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// ============================================
// 이벤트 바인딩
// ============================================
function bindEvents() {
    // 신장 입력 (blur 시 검증)
    DOM.heightInput.addEventListener('blur', function (e) {
        handleHeightChange(e.target.value);
    });

    // 키보드 입력
    DOM.heightInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleStepper('increase');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleStepper('decrease');
        }
    });

    // 슬라이더
    DOM.heightSlider.addEventListener('input', function (e) {
        handleHeightChange(e.target.value, true);
    });

    // 스텝퍼 버튼
    DOM.stepperBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            handleStepper(btn.getAttribute('data-action'));
        });
    });

    // 체형 프로필 탭
    DOM.profileTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            handleProfileChange(tab.getAttribute('data-profile'));
        });

        // 키보드 접근성
        tab.addEventListener('keydown', function (e) {
            const tabs = Array.from(DOM.profileTabs);
            let index = tabs.indexOf(tab);

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                index = (index + 1) % tabs.length;
                tabs[index].click();
                tabs[index].focus();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                index = (index - 1 + tabs.length) % tabs.length;
                tabs[index].click();
                tabs[index].focus();
            }
        });
    });

    // 환경 선택
    DOM.envOptions.forEach(function (option) {
        option.addEventListener('click', function () {
            handleEnvironmentChange(option.getAttribute('data-env'));
        });
    });

    // 정보 탭 전환
    DOM.infoTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            handleTabChange(tab.getAttribute('data-tab'));
        });
    });
}

// ============================================
// 초기화
// ============================================
function init() {
    loadState();
    cacheDOMElements();
    syncInputs();
    syncProfileTabs();
    syncEnvironment();
    render();
    bindEvents();

    console.log('✅ KID BLOG v3.2 초기화 완료');
    console.log('📊 현재 상태:', STATE);
    console.log('🏠 환경:', ENVIRONMENTS[STATE.environment].name);
    console.log('👤 체형:', PROFILE_INFO[STATE.profile].name);
}

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}