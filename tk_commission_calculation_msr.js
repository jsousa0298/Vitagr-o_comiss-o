/**
 * @NApiVersion 2.1
 * @NModuleScope public
 */

define(['N/ui/dialog', 'N/search', 'N/record', '../Utils/tk_commission_calculation_cts'],
    (dialog, search, record, cts) => {

        function calculateCommissionByTransaction(scriptContext) {
            const newRecord = scriptContext.newRecord;
            const recordId = newRecord.id;
            const recordType = newRecord.type;

            if (!recordId) return;

            const trandate = newRecord.getText('trandate');
            const customerId = newRecord.getValue('entity');
            const salesrep = newRecord.getValue('salesrep');
            const commissionCalculationForm = newRecord.getValue('custbody_tk_method_calculating_com_ls');

            if (commissionCalculationForm && trandate) {
                var filters = [
                    ['custrecord_tk_data_start_dt', 'onorbefore', trandate],
                    'AND',
                    ['custrecord_tk_date_end_dt', 'onorafter', trandate],
                    'AND',
                    ['isinactive', 'is', 'F'],
                ];

                if (commissionCalculationForm == 1)
                    filters.push('AND', ['customrecord_tk_commission_rules', 'is', true]);
                else if (commissionCalculationForm == 2)
                    filters.push('AND', ['custrecord_tk_region_tx', 'is', getRegionIdByState(customerId)]);
                else if (commissionCalculationForm == 3) {
                    filters.push('AND', ['custrecord_tk_salesrep_ls', 'is', salesrep]);
                }

                const result = getCommissionPercentageByDate(filters);

                log.audit('result', result);

                const transaction = record.load({
                    type: recordType,
                    id: recordId,
                    isDynamic: false
                });

                var totalCommission = 0;
                const lineCount = transaction.getLineCount({ sublistId: 'item' });

                for (let i = 0; i < lineCount; i++) {
                    totalCommission += processItemLine(transaction, i, result, totalCommission);
                }

                transaction.setValue('custbody_tk_commission_amount', totalCommission);

                var idRec = transaction.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });

                log.audit('totalCommission', totalCommission);
            };

        }

        /**
         * Maps state abbreviations to their corresponding region IDs.
         * @param {string} state - The state abbreviation (e.g., 'SP', 'RJ', 'BA').
         * @returns {number|null} - The region ID or null if not found.
         */
        function getRegionIdByState(customerId) {

            const customerSearch = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: customerId,
                columns: ['billstate']
            });

            let state = customerSearch.billstate[0].value

            const stateToRegionMap = {
                'DF': 3, 'GO': 3, 'MT': 3, 'MS': 3,  // Center-West
                'AL': 2, 'BA': 2, 'CE': 2, 'MA': 2, 'PB': 2, 'PE': 2, 'PI': 2, 'RN': 2, 'SE': 2,  // Northeast
                'AC': 1, 'AP': 1, 'AM': 1, 'PA': 1, 'RO': 1, 'RR': 1, 'TO': 1,  // North
                'ES': 4, 'MG': 4, 'RJ': 4, 'SP': 4,  // Southeast
                'PR': 5, 'RS': 5, 'SC': 5  // South
            };

            return stateToRegionMap[state] || null;
        }

        /**
        * Processa uma linha da sublista 'item' para calcular e definir a comissão.
        */
        function processItemLine(transaction, lineIndex, result, totalCommission) {
            const itemId = transaction.getSublistValue({ sublistId: 'item', fieldId: 'item', line: lineIndex });
            const amount = transaction.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: lineIndex });
            var commissionValue = 0;

            if (result) {
                const commissionPercentage = parseFloat(result.commissionPercentage.replace('%', '')) || 0;
                commissionValue = (amount * commissionPercentage) / 100;

                // if (!getItemCommission(itemId, result.id)) {
                //     commissionValue = 0;
                // }
            } else {
                commissionValue = 0;
            }

            transaction.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_tk_value_commission',
                line: lineIndex,
                value: commissionValue
            });

            return commissionValue
        }

        function getItemCommission(itemId, id) {
            var commissionSearch = search.create({
                type: 'customrecord_tk_itens_commission',
                filters: [
                    ['custrecord_tk_item_commission', 'is', itemId],
                    'AND',
                    ['custrecord_tk_link_tk_commission_rules', 'is', id],
                    'AND',
                    ['isinactive', 'is', 'F'],
                ]
            });

            return !!commissionSearch.run().getRange({ start: 0, end: 1 }).length;
        };

        function getCommissionPercentageByDate(filters) {
            var commissionData = null;

            var commissionSearch = search.create({
                type: 'customrecord_tk_commission_rules',
                filters: filters,
                columns: [
                    'custrecord_tk_commission_percentage_pc'
                ]
            });

            var searchResult = commissionSearch.run().getRange({ start: 0, end: 1 });

            if (searchResult.length > 0) {
                commissionData = {
                    id: searchResult[0].id,
                    commissionPercentage: searchResult[0].getValue('custrecord_tk_commission_percentage_pc')
                };
            }

            return commissionData;
        }

        function handleFieldDisabling(scriptContext) {
            var currentRecord = scriptContext.currentRecord;

            var rules = {
                'custrecord_tk_customer_ls': ['custrecord_tk_salesrep_ls', 'custrecord_tk_region_tx'],
                'custrecord_tk_salesrep_ls': ['custrecord_tk_customer_ls', 'custrecord_tk_region_tx'],
                'custrecord_tk_region_tx': ['custrecord_tk_customer_ls', 'custrecord_tk_salesrep_ls']
            };

            Object.keys(rules).forEach(function (fieldId) {
                var value = currentRecord.getValue({ fieldId: fieldId });

                if (value) {
                    rules[fieldId].forEach(function (targetField) {
                        var targetFieldObj = currentRecord.getField({ fieldId: targetField });
                        if (targetFieldObj) {
                            targetFieldObj.isDisabled = true;
                        }
                    });
                }
            });
        }

        function handleFieldDisablingOnChange(scriptContext) {
            var currentRecord = scriptContext.currentRecord;
            var fieldId = scriptContext.fieldId;

            var rules = {
                'custrecord_tk_customer_ls': ['custrecord_tk_salesrep_ls', 'custrecord_tk_region_tx'],
                'custrecord_tk_salesrep_ls': ['custrecord_tk_customer_ls', 'custrecord_tk_region_tx'],
                'custrecord_tk_region_tx': ['custrecord_tk_customer_ls', 'custrecord_tk_salesrep_ls'],
            };

            if (rules[fieldId]) {
                var value = currentRecord.getValue({ fieldId: fieldId });

                rules[fieldId].forEach(function (targetField) {
                    var targetFieldObj = currentRecord.getField({ fieldId: targetField });
                    if (targetFieldObj) {
                        targetFieldObj.isDisabled = !!value;
                    }
                });
            }
        }

        function validateDateFields(scriptContext) {
            var currentRecord = scriptContext.currentRecord;
            var fieldId = scriptContext.fieldId;

            if (fieldId === 'custrecord_tk_data_start_dt' || fieldId === 'custrecord_tk_date_end_dt') {
                var dateStart = currentRecord.getValue({ fieldId: 'custrecord_tk_data_start_dt' });
                var dateEnd = currentRecord.getValue({ fieldId: 'custrecord_tk_date_end_dt' });

                if (dateStart && dateEnd && new Date(dateStart) > new Date(dateEnd)) {
                    dialog.alert({
                        title: 'Validação Necessária',
                        message: 'A data de início não pode ser maior que a data final.'
                    });

                    currentRecord.setValue({ fieldId: fieldId, value: null });
                };
            };
        };

        function validateMandatoryFields(scriptContext) {
            var currentRecord = scriptContext.currentRecord;


            var customer = currentRecord.getValue({ fieldId: 'custrecord_tk_customer_ls' });
            var region = currentRecord.getValue({ fieldId: 'custrecord_tk_region_tx' });
            var salesrep = currentRecord.getValue({ fieldId: 'custrecord_tk_salesrep_ls' });

            if (!customer && !region && !salesrep) {
                dialog.alert({
                    title: 'Validação Necessária',
                    message: 'Pelo menos um dos seguintes campos deve ser preenchido: Região ou Representante de Vendas.'
                });

                return false;
            }

            var startDateText = currentRecord.getText({ fieldId: 'custrecord_tk_data_start_dt' });
            var isValid = true;

            var commissionRuleFilters = [
                ["isinactive", "is", "F"],
                "AND",
                ["custrecord_tk_data_start_dt", "onorbefore", startDateText],
                "AND",
                ["custrecord_tk_date_end_dt", "onorafter", startDateText]
            ];

            if (salesrep)
                commissionRuleFilters.push("AND", ["custrecord_tk_salesrep_ls", "anyof", salesrep]);

            if (region)
                commissionRuleFilters.push("AND", ["custrecord_tk_region_tx", "anyof", region]);

            log.audit('commissionRuleFilters', commissionRuleFilters)

            search.create({
                type: "customrecord_tk_commission_rules",
                filters: commissionRuleFilters,
                columns: []
            }).run().each(function (result) {
                isValid = false;
                var recordId = result.id;
                var recordUrl = 'https://11198682-sb1.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=6441&id=' + recordId;

                dialog.alert({
                    title: 'Alerta',
                    message: 'Já existe uma Regra de Cálculo de Comissão com essa data de início. <br><br>' +
                        'Você pode visualizá-la clicando <a href="' + recordUrl + '" target="_blank">aqui</a>.'
                });

                return true;
            });

            if (!isValid) {
                return false;
            }

            return true;
        }

        return {
            calculateCommissionByTransaction: calculateCommissionByTransaction,
            handleFieldDisabling: handleFieldDisabling,
            validateDateFields: validateDateFields,
            handleFieldDisablingOnChange: handleFieldDisablingOnChange,
            validateMandatoryFields: validateMandatoryFields
        };
    }
);