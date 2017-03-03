export class IOSLogFilter implements Mobile.IPlatformLogFilter {
	private static INFO_FILTER_REGEX = /^.*?(AppBuilder|Cordova|NativeScript).*?(<Notice>:.*?|<Warning>:.*?|<Error>:.*?)$/im;

	constructor(private $loggingLevels: Mobile.ILoggingLevels) { }

	public filterData(data: string, logLevel: string, projectDir: string, pid?: string): string {
		let specifiedLogLevel = (logLevel || '').toUpperCase();

		if (specifiedLogLevel === this.$loggingLevels.info) {
			if (pid) {
				return data && data.indexOf(`[${pid}]`) !== -1 ? data.trim() : null;
			}

			let matchingInfoMessage = data.match(IOSLogFilter.INFO_FILTER_REGEX);
			return matchingInfoMessage ? matchingInfoMessage[2] : null;
		}

		return data;
	}
}
$injector.register("iOSLogFilter", IOSLogFilter);