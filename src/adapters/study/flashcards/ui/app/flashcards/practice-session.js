export function createPracticeSession(cards) {
    let index = 0;
    const grades = new Map();
    return {
        get current() {
            return cards[index];
        },
        get canPrevious() {
            return index > 0;
        },
        get answeredGrade() {
            return grades.get(index);
        },
        get answered() {
            return grades.has(index);
        },
        next(grade) {
            if (grade) grades.set(index, grade);
            index++;
        },
        previous() {
            index = Math.max(0, index - 1);
        },
    };
}
