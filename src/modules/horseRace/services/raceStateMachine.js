// Authoritative Server-Side State Machine for Global Race Lifecycle

const RACE_STATUSES = Object.freeze({
    WAITING: 'WAITING',
    BETTING_OPEN: 'BETTING_OPEN',
    BETTING_CLOSED: 'BETTING_CLOSED',
    COUNTDOWN: 'COUNTDOWN',
    RUNNING: 'RUNNING',
    FINISHING: 'FINISHING',
    RESULT: 'RESULT',
    FINISHED: 'FINISHED',
    CANCELLED: 'CANCELLED',
});

// Explicit Allowed State Transitions
const VALID_RACE_TRANSITIONS = Object.freeze({
    [RACE_STATUSES.WAITING]: [RACE_STATUSES.BETTING_OPEN, RACE_STATUSES.CANCELLED],
    [RACE_STATUSES.BETTING_OPEN]: [RACE_STATUSES.BETTING_CLOSED, RACE_STATUSES.CANCELLED],
    [RACE_STATUSES.BETTING_CLOSED]: [RACE_STATUSES.COUNTDOWN, RACE_STATUSES.CANCELLED],
    [RACE_STATUSES.COUNTDOWN]: [RACE_STATUSES.RUNNING, RACE_STATUSES.CANCELLED],
    [RACE_STATUSES.RUNNING]: [RACE_STATUSES.FINISHING, RACE_STATUSES.CANCELLED],
    [RACE_STATUSES.FINISHING]: [RACE_STATUSES.RESULT, RACE_STATUSES.CANCELLED],
    [RACE_STATUSES.RESULT]: [RACE_STATUSES.FINISHED, RACE_STATUSES.CANCELLED],
    [RACE_STATUSES.FINISHED]: [RACE_STATUSES.WAITING, RACE_STATUSES.BETTING_OPEN],
    [RACE_STATUSES.CANCELLED]: [RACE_STATUSES.WAITING, RACE_STATUSES.BETTING_OPEN],
});

class RaceStateMachine {
    static isValidTransition(currentStatus, nextStatus) {
        if (!currentStatus || !nextStatus) return false;
        const allowed = VALID_RACE_TRANSITIONS[currentStatus];
        return Array.isArray(allowed) && allowed.includes(nextStatus);
    }

    static validateTransition(currentStatus, nextStatus) {
        if (!this.isValidTransition(currentStatus, nextStatus)) {
            const error = new Error(`Invalid race state transition: Cannot change race status from '${currentStatus}' to '${nextStatus}'`);
            error.statusCode = 400;
            throw error;
        }
        return true;
    }

    static isBettingAllowed(status) {
        return status === RACE_STATUSES.BETTING_OPEN;
    }

    static isTerminal(status) {
        return status === RACE_STATUSES.FINISHED || status === RACE_STATUSES.CANCELLED;
    }
}

module.exports = {
    RACE_STATUSES,
    RaceStateMachine,
};

