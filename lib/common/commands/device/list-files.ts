export class ListFilesCommand implements ICommand {
	constructor(private $devicesService: Mobile.IDevicesService,
		private $stringParameter: ICommandParameter,
		private $options: IOptions,
		private $projectData: IProjectData,
		private $errors: IErrors) { }

	public allowedParameters: ICommandParameter[] = [this.$stringParameter, this.$stringParameter];

	public async execute(args: string[]): Promise<void> {
		await this.$devicesService.initialize({ deviceId: this.$options.device, skipInferPlatform: true });
		const pathToList = args[0];
		let appIdentifier = args[1];

		if (!appIdentifier) {
			try {
				this.$projectData.initializeProjectData();
			} catch (err) {
				// ignore the error
			}
			if (!this.$projectData.projectIdentifiers) {
				this.$errors.fail("Please enter application identifier or execute this command in project.");
			}
		}

		const action = async (device: Mobile.IDevice) => {
			appIdentifier = appIdentifier || this.$projectData.projectIdentifiers[device.deviceInfo.platform.toLowerCase()];
			await device.fileSystem.listFiles(pathToList, appIdentifier);
		};
		await this.$devicesService.execute(action);
	}
}

$injector.registerCommand(["device|list-files", "devices|list-files"], ListFilesCommand);
