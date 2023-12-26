const selection = figma.currentPage.selection[0]

if (selection) {
	const selectionX = selection.x
	const selectionY = selection.y
	const selectionWidth = selection.width // 用 x 有可能會跟 selection 重疊，因此改抓 width
	let nodeY: number = selectionY
	let newSelection = [] as SceneNode[]

	switch (selection.type) {
		case 'COMPONENT_SET':
			// Sort variant type to differant array
			const booleanArray: string[] = []
			const variantArray: object[] = []
			for (const [property, value] of Object.entries(
				selection.componentPropertyDefinitions
			)) {
				switch (value.type) {
					case 'VARIANT':
						const variant: object = {
							[property]: value.variantOptions,
						}
						variantArray.push(variant)
						break
					case 'BOOLEAN':
						booleanArray.push(property)
						break
				}
			}
			const booleanCombination = generateBooleanProperties(booleanArray)
			const variantCombination = variantTable(variantArray, [], booleanCombination)
			console.log(variantCombination)
			figma.closePlugin('Done')
			break

		case 'COMPONENT':
			// Handle componentNode
			break
		default:
			figma.closePlugin('Select a component please')
			break
	}

	function variantTable(
		variantArray: object[],
		propertiesArray: object[],
		booleanCombination?: object[]
	) {
		if (variantArray.length === 0) return propertiesArray

		const currentVariant = variantArray.shift() as object
		const propertyName: string = Object.keys(currentVariant).toString()
		const variantOption: string[] = Object.values(currentVariant)[0] // 不知道為何還有多包一層，因此加上 [0]
		let newPropertiesArray: object[] = [] // 之前應該是沒給到這個暫存空間，才導致產出的 object 的 option 一直被覆蓋掉。

		if (propertiesArray.length === 0) {
			for (const option of variantOption) {
				const newProperties: object = {
					[propertyName]: option,
				}
				propertiesArray.push(newProperties)
			}
			return variantTable(variantArray, propertiesArray)
		} else {
			variantOption.map((option) => {
				propertiesArray.map((properties) => {
					const newProperties = {
						...properties,
						[propertyName]: option,
					}

					newPropertiesArray.push(newProperties)
				})
			})
			return variantTable(variantArray, newPropertiesArray)
		}
	}

	function generateBooleanProperties(booleanList: string[]) {
		let booleanCombination: object[] = []
		let allTrueProperty: object = {}
		let allFalseProperty: object = {}

		// Intialize all true scenario object
		booleanList.forEach((boolean) => {
			allTrueProperty = {
				...allTrueProperty,
				[boolean]: true,
			}
		})
		booleanCombination.push(allTrueProperty)

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
					booleanCombination.push(setToTrueProperty)
				}
			}
		})

		booleanCombination.push(allFalseProperty)
		return booleanCombination
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
