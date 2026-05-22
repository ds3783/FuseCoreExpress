export async function sleep(timeout) {
    return new Promise(resolve => {
        setTimeout(function () {
            resolve();
        }, timeout || 0);
    })
}