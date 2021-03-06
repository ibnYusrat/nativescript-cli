export class PutFileCommand implements ICommand {
	constructor(private $devicesService: Mobile.IDevicesService,
		private $stringParameter: ICommandParameter,
		private $options: IOptions,
		private $projectData: IProjectData,
		private $errors: IErrors) { }

	allowedParameters: ICommandParameter[] = [this.$stringParameter, this.$stringParameter, this.$stringParameter];

	public async execute(args: string[]): Promise<void> {
		await this.$devicesService.initialize({ deviceId: this.$options.device, skipInferPlatform: true });
		let appIdentifier = args[2];

		if (!appIdentifier) {
			try {
				this.$projectData.initializeProjectData();
			} catch (err) {
				// ignore the error
			}
			if (!this.$projectData.projectIdentifiers) {
				this.$errors.failWithoutHelp("Please enter application identifier or execute this command in project.");
			}
		}

		const action = async (device: Mobile.IDevice) => {
			appIdentifier = appIdentifier || this.$projectData.projectIdentifiers[device.deviceInfo.platform.toLowerCase()];
			await device.fileSystem.putFile(args[0], args[1], appIdentifier);
		};
		await this.$devicesService.execute(action);
	}
}
$injector.registerCommand(["device|put-file", "devices|put-file"], PutFileCommand);
