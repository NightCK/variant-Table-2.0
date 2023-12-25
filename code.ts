const selection = figma.currentPage.selection[0]

if (selection) {
	const selectionX = selection.x
	const selectionY = selection.y
	const selectionWidth = selection.width // 用 x 有可能會跟 selection 重疊，因此改抓 width
	let nodeY: number = selectionY
	let newSelection = [] as SceneNode[]

	switch (selection.type) {
		case 'COMPONENT_SET':
			const variantList = selection.findChildren(
				(node) => node.type === 'COMPONENT'
			) as ComponentNode[]
			const booleanList: string[] = []

			// Find boolean property and push it into booleanList
			for (const [property, value] of Object.entries(
				selection.componentPropertyDefinitions
			)) {
				if (value.type === 'BOOLEAN') {
					booleanList.push(property)
				}
			}

			//  Generate variant with different boolean value
			if (booleanList.length > 0) {
				// Generate every possible boolean combination
				const propertiesCombination = generateBooleanProperties(booleanList)

				variantList.forEach((variant) => {
					for (const properties of propertiesCombination) {
						const node = createVariant(variant)
						node.setProperties({ ...properties })
						newSelection.push(node)
					}
				})
			}

			figma.currentPage.selection = newSelection
			figma.viewport.scrollAndZoomIntoView(newSelection)
			figma.closePlugin('Done')
			break
		case 'COMPONENT':
			// Handle componentNode
			break
		default:
			figma.closePlugin('Select a component please')
	}

	function generateBooleanProperties(booleanList: string[]) {
		let booleanResult: object[] = []
		let allTrueProperty: object = {}
		let allFalseProperty: object = {}

		// Intialize all true scenario object
		booleanList.forEach((boolean) => {
			allTrueProperty = {
				...allTrueProperty,
				[boolean]: true,
			}
		})
		booleanResult.push(allTrueProperty)

		// Intialize all false scenario object,
		// but push this array in the end of the function, to make sure the order is correct
		booleanList.forEach((boolean) => {
			allFalseProperty = {
				...allFalseProperty,
				[boolean]: false,
			}
		})

		// Generate all kinds of boolean scenarios
		booleanList.forEach((anchor) => {
			// Note the location of the anchor
			const index = booleanList.indexOf(anchor)
			// use slice() to create a new array
			const arraySlice = booleanList.slice(index)
			// Resemble the array, the index item become the first item in this new array
			for (let i = 0; i < index; i++) {
				arraySlice.push(booleanList[i])
			}
			let setToTrueProperty = allTrueProperty

			for (const bool of arraySlice) {
				if (bool !== anchor) {
					setToTrueProperty = {
						...setToTrueProperty,
						[bool]: false,
					}
					booleanResult.push(setToTrueProperty)
				}
			}
		})

		booleanResult.push(allFalseProperty)
		return booleanResult
	}

	function createVariant(variant: ComponentNode) {
		const node = variant.createInstance()
		node.x = selectionX + selectionWidth + 24
		node.y = nodeY
		nodeY += variant.height + 16 // 避免元件重疊，抓 variant 高度加上 spacing
		return node
	}
} else {
	figma.closePlugin('Please select a component')
}
