
import moment from "moment";

export const Timedifference = (time) => {
    let daysdiff = new Date().getDate() - new Date(time).getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let daysuffix;
    daysuffix = moment.localeData().ordinal(new Date(time).getDate())
    if (daysdiff === 0 && new Date().getMonth() === new Date(time).getMonth() && new Date().getFullYear() === new Date(time).getFullYear()) {
        return 'TODAY'
    }
    else if (daysdiff === 1 && new Date().getMonth() === new Date(time).getMonth() && new Date().getFullYear() === new Date(time).getFullYear()) {
        return 'YESTERDAY'
    }
    else {
        return daysuffix + " " + months[new Date(time).getMonth()]
    }
}