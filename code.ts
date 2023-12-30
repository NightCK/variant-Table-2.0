const selection = figma.currentPage.selection[0]

if (selection) {
	VariantTable()
} else {
	figma.closePlugin('Please select a component')
}

async function VariantTable() {
	await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
	await figma.loadFontAsync({ family: 'Inter', style: 'Bold' })

	if (selection) {
		var indexProp: string = 'State' // 開發用，先寫死 'State'
		const selectionX = selection.x
		const selectionY = selection.y
		const selectionWidth = selection.width // 用 x 有可能會跟 selection 重疊，因此改抓 width
		const containerFrame: FrameNode = figma.createFrame()
		const booleanList: string[] = []
		const indexList: string[] = []
		let nodeY: number = selectionY
		let newSelection = [] as SceneNode[]

		// Sort property
		switch (selection.type) {
			case 'COMPONENT_SET':
				const variantList = selection.findChildren(
					(node) => node.type === 'COMPONENT'
				) as ComponentNode[]

				// Sort property type
				for (const [property, value] of Object.entries(
					selection.componentPropertyDefinitions
				)) {
					if (value.type === 'BOOLEAN') {
						booleanList.push(property)
					}
					// TODO 要顯示到 UI 上，讓使用者選擇用什麼來 Group
					if (value.type === 'VARIANT') {
						indexList.push(property)
					}
				}

				// 建立主要容器的 Frame
				containerFrame.name = selection.name
				containerFrame.layoutMode = 'VERTICAL'
				containerFrame.layoutSizingVertical = 'HUG'
				containerFrame.layoutSizingHorizontal = 'HUG'
				containerFrame.itemSpacing = 0
				containerFrame.x = selectionX + selectionWidth + 24
				containerFrame.y = selectionY

				const booleanCombination = generateBooleanProperties(booleanList)
				selection.componentPropertyDefinitions[indexProp].variantOptions?.forEach(
					(indexOption) => {
						const regex = new RegExp(`${indexProp}=${indexOption}`, 'ig')
						const variantGroup: ComponentNode[] = variantList.filter((variant) =>
							variant.name.match(regex)
						)

						// 建立各群組的 Frame
						const groupFrame: FrameNode = figma.createFrame()
						groupFrame.name = `${indexProp}:${indexOption}`
						groupFrame.layoutMode = 'VERTICAL'
						groupFrame.layoutSizingVertical = 'HUG'
						groupFrame.layoutSizingHorizontal = 'HUG'
						groupFrame.paddingTop = 20
						groupFrame.paddingBottom = 20
						groupFrame.paddingLeft = 20
						groupFrame.paddingRight = 20
						groupFrame.itemSpacing = 16

						const groupTitle: TextNode = figma.createText()
						groupTitle.characters = indexOption
						groupTitle.fontName = { family: 'Inter', style: 'Bold' }
						groupTitle.fontSize = 32
						groupTitle.textCase = 'TITLE'
						groupFrame.appendChild(groupTitle)

						const instanceGroup: FrameNode = createVariant(
							indexOption,
							variantGroup,
							booleanCombination
						)

						groupFrame.appendChild(instanceGroup)
						containerFrame.appendChild(groupFrame)
					}
				)

				newSelection.push(containerFrame)
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

		function createVariant(
			indexOption: string,
			variantGroup: ComponentNode[],
			booleanCombination?: object[]
		) {
			const Container: FrameNode = figma.createFrame()
			Container.name = `${indexProp}:${indexOption}`
			Container.layoutMode = 'HORIZONTAL'
			Container.layoutSizingVertical = 'HUG'
			Container.layoutSizingHorizontal = 'HUG'
			Container.paddingTop = 20
			Container.paddingBottom = 20
			Container.paddingLeft = 20
			Container.paddingRight = 20
			Container.itemSpacing = 48

			variantGroup.map((variant) => {
				const variantContainer: FrameNode = figma.createFrame()
				variantContainer.name = variant.name
				variantContainer.layoutMode = 'VERTICAL'
				variantContainer.layoutSizingVertical = 'HUG'
				variantContainer.layoutSizingHorizontal = 'HUG'
				variantContainer.itemSpacing = 16
				Container.appendChild(variantContainer)

				const variantTitle: TextNode = figma.createText()
				variantTitle.characters = variant.name
				variantTitle.fontName = { family: 'Inter', style: 'Bold' }
				variantTitle.fontSize = 16
				variantTitle.textCase = 'TITLE'
				variantContainer.appendChild(variantTitle)

				const variantCollection: FrameNode = figma.createFrame()
				variantCollection.name = 'Variants'
				variantCollection.layoutMode = 'VERTICAL'
				variantCollection.layoutSizingVertical = 'HUG'
				variantCollection.layoutSizingHorizontal = 'HUG'
				variantCollection.itemSpacing = 16
				variantContainer.appendChild(variantCollection)

				if (booleanCombination) {
					for (const combination of booleanCombination) {
						const newInstance = variant.createInstance()
						newInstance.setProperties({ ...combination })
						variantCollection.appendChild(newInstance)
					}
				} else {
					const newInstance = variant.createInstance()
					variantCollection.appendChild(newInstance)
				}
			})
			return Container
		}
	}
}
