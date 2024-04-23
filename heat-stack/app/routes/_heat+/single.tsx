/** THE BELOW PROBABLY NEEDS TO MOVE TO A ROUTE RATHER THAN A COMPONENT, including action function, */
// import { redirect } from '@remix-run/react'
import { useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { json, ActionFunctionArgs } from '@remix-run/node'
import { Form, redirect, useActionData } from '@remix-run/react'
import { z } from 'zod'
import GeocodeUtil from "#app/utils/GeocodeUtil.js";
import WeatherUtil from "#app/utils/WeatherUtil.js";
import PyodideUtil  from "#app/utils/pyodide.util.js";

// TODO NEXT WEEK
// - [x] Server side error checking/handling
// - [x] ~Save to cookie and redirect to next form~ Put everything on the same page
// - [x] - Get zod and Typescript to play nice
// - [x] (We're here) Build form #2
// - [ ] Build upload form
//   - https://www.epicweb.dev/workshops/professional-web-forms/file-upload/intro-to-file-upload
//   - https://github.com/epicweb-dev/web-forms/tree/main/exercises/04.file-upload
//   - https://github.com/epicweb-dev/web-forms/blob/2c10993e4acffe3dd9ad7b9cb0cdf89ce8d46ecf/exercises/04.file-upload/01.solution.multi-part/app/routes/users%2B/%24username_%2B/notes.%24noteId_.edit.tsx#L58
//   - createMemoryUploadHandler
//   - parseMultipartFormData
//   - avoid dealing with the server for now
//   - pass the data to the rules engine/pyodide either in the component or the action (probably the action for validation, etc.)
// - [ ] (On hold for data format from rules engine) Build table form
// - [ ] Form errors (if we think of a use case - 2 fields conflicting...)

// Ours
import { ErrorList } from '#app/components/ui/heat/CaseSummaryComponents/ErrorList.tsx'
import { Home, Location, Case } from '../../../types/index.ts'
import { CurrentHeatingSystem } from '../../components/ui/heat/CaseSummaryComponents/CurrentHeatingSystem.tsx'
import { EnergyUseHistory } from '../../components/ui/heat/CaseSummaryComponents/EnergyUseHistory.tsx'
import { HomeInformation } from '../../components/ui/heat/CaseSummaryComponents/HomeInformation.tsx'
import HeatLoadAnalysis from './heatloadanalysis.tsx'
import { Button } from '#/app/components/ui/button.tsx'


const nameMaxLength = 50
const addressMaxLength = 100

/** Modeled off the conform example at
 *     https://github.com/epicweb-dev/web-forms/blob/b69e441f5577b91e7df116eba415d4714daacb9d/exercises/03.schema-validation/03.solution.conform-form/app/routes/users%2B/%24username_%2B/notes.%24noteId_.edit.tsx#L48 */

// const HomeInformationSchema = {
// 	name: z.string().min(1).max(nameMaxLength),
// 	address: z.string().min(1).max(addressMaxLength),
// 	livingSpace: z.number().min(1),
// }
// // type Home = z.infer<typeof HomeSchema>

// // TODO Next: Ask an LLM how we get fuelType out of HomeSchema from zod

const HomeFormSchema = Home.pick({ livingArea: true })
	.and(Location.pick({ address: true }))
	.and(Case.pick({ name: true }))

const CurrentHeatingSystemSchema = Home.pick({
	fuelType: true,
	heatingSystemEfficiency: true,
	designTemperatureOverride: true,
	thermostatSetPoint: true,
	setbackTemperature: true,
	setbackHoursPerDay: true,

})

const Schema = HomeFormSchema.and(CurrentHeatingSystemSchema)

// const EnergyUseSchema = '';

export async function action({ request, params }: ActionFunctionArgs) {
	// Checks if url has a homeId parameter, throws 400 if not there
	// invariantResponse(params.homeId, 'homeId param is required')

	console.log("action started")

	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: Schema,
	})

	if (submission.status !== 'success') {
		console.error("submission failed",submission)
		return submission.reply()
		// submission.reply({
		// 	// You can also pass additional error to the `reply` method
		// 	formErrors: ['Submission failed'],
		// 	fieldErrors: {
		// 		address: ['Address is invalid'],
		// 	},

		// 	// or avoid sending the the field value back to client by specifying the field names
		// 	hideFields: ['password'],
		// }),
		// {status: submission.status === "error" ? 400 : 200}
	}

	const { name, address, livingArea, fuelType,
		heatingSystemEfficiency,
		thermostatSetPoint,
		setbackTemperature,
		setbackHoursPerDay,
		designTemperatureOverride } = submission.value

	// await updateNote({ id: params.noteId, title, content })
//code snippet from - https://github.com/epicweb-dev/web-forms/blob/2c10993e4acffe3dd9ad7b9cb0cdf89ce8d46ecf/exercises/04.file-upload/01.solution.multi-part/app/routes/users%2B/%24username_%2B/notes.%24noteId_.edit.tsx#L180

	// const formData = await parseMultipartFormData(
	// 	request,
	// 	createMemoryUploadHandler({ maxPartSize: MAX_UPLOAD_SIZE }),
	// )

	console.log("loading PU/PM/GU/WU");

	// CONSOLE: loading PU/PM/GU/WU
	// Error: No known package with name 'pydantic_core'
	// Error: No known package with name 'pydantic_core'
	// 	at addPackageToLoad (/workspaces/home-energy-analysis-tool/heat-stack/public/pyodide-env/pyodide.asm.js:9:109097)
	// 	at recursiveDependencies (/workspaces/home-energy-analysis-tool/heat-stack/public/pyodide-env/pyodide.asm.js:9:109370)
	// 	at loadPackage (/workspaces/home-energy-analysis-tool/heat-stack/public/pyodide-env/pyodide.asm.js:9:111435)
	// 	at initializePackageIndex (/workspaces/home-energy-analysis-tool/heat-stack/public/pyodide-env/pyodide.asm.js:9:108508)

	// const PU = PyodideUtil.getInstance();
	// const PM = await PU.getPyodideModule();
	const GU = new GeocodeUtil();
	const WU = new WeatherUtil();
	// console.log("loaded PU/PM/GU/WU");

/**
 * 
 * @param longitude 
 * @param latitude 
 * @param start_date 
 * @param end_date 
 * @returns {SI,TIWD,BI} Summary input: hardcoded data.TIWD: TemperatureInput: WeatherData from calling open meto API
 * Billing input: hardcoded data
 * 
 * Function just to generate test data. inputs come from the values entered in from HomeInformation component
 */
async function genny(longitude: number, latitude: number, start_date: string, end_date: string) {
	// SI = new SummaryInput(6666,"GAS",80,67,null,null,60);
	// was living_area: number, fuel_type: FuelType, heating_system_efficiency: number, thermostat_set_point: number, setback_temperature: number | null, setback_hours_per_day: number | null, design_temperature: number
	
	type SchemaZodFromFormType = z.infer<typeof Schema>;


	
	const oldSummaryInput = {
		living_area: 6666,
		fuel_type: "GAS",
		heating_system_efficiency: 80,
		thermostat_set_point: 67,
		setback_temperature: null,
		setback_hours_per_day: null,
		design_temperature: 60,
	  };
	  
	  const SI: SchemaZodFromFormType = Schema.parse({
		livingArea: oldSummaryInput.living_area,
		address: '123 Main St', // Provide a valid address
		name: 'My Home', // Provide a valid name
		fuelType: oldSummaryInput.fuel_type === 'GAS' ? 'Natural Gas' : oldSummaryInput.fuel_type,
		heatingSystemEfficiency: oldSummaryInput.heating_system_efficiency,
		thermostatSetPoint: oldSummaryInput.thermostat_set_point,
		setbackTemperature: oldSummaryInput.setback_temperature,
		setbackHoursPerDay: oldSummaryInput.setback_hours_per_day,
		designTemperatureOverride: oldSummaryInput.design_temperature,
	  });
	
	  console.log("SI", SI)


	// const TIWD: TemperatureInput = await WU.getThatWeathaData(longitude, latitude, start_date, end_date);
	const TIWD = await WU.getThatWeathaData(longitude, latitude, start_date, end_date);
	const BI = [{
		period_start_date: new Date("2023-12-30"),//new Date("2023-12-30"),
		period_end_date: new Date("2024-01-06"),
		usage:100,
		inclusion_override: null
	}];
	return {SI, TIWD, BI};
}

	
	let { x, y } = await GU.getLL(address);
	console.log("geocoded", x,y)

	let { SI, TIWD, BI } = await genny(x,y,"2024-01-01","2024-01-03")

	// PU.runit(SI,null,TIWD,JSON.stringify(BI));
	// CSV entrypoint parse_gas_bill(data: str, company: NaturalGasCompany)
	// Main form entrypoint

	return redirect(`/single`)
}



export default function Inputs() {
	const lastResult = useActionData<typeof action>()
	const [form, fields] = useForm({
		lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: Schema })
		},
		defaultValue: {},
		shouldValidate: 'onBlur',
	})

	return (
		<>
			<Form
				id={form.id}
				method="post"
				onSubmit={form.onSubmit}
				action="/single"
				encType="multipart/form-data"
			>
				<HomeInformation fields={fields} />
				<CurrentHeatingSystem fields={fields} />
				<EnergyUseHistory />
				<ErrorList id={form.errorId} errors={form.errors} />
				<Button type="submit">Submit</Button>
			</Form>
			<HeatLoadAnalysis />
		</>
	)
}
